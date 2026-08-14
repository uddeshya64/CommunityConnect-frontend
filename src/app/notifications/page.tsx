"use client";

import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Check, X, Users, Shield, 
  Loader2, Inbox 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/home/SideBar";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { notificationService, NotificationItem } from "@/services/notification.service";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { pushNotificationService } from "@/services/pushNotification.service";

function NotificationsPageContent() {
  const router = useRouter();
  const { isDark, activeAccent } = useAppearance();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean | null>(null);
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  // 1. Fetch user notifications & push status
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.error || "Failed to load notifications."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    pushNotificationService.getStatus().then((st) => {
      setIsPushSubscribed(st.isSubscribed);
    });
  }, []);

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    try {
      const res = await pushNotificationService.subscribeToPush();
      if (res.success) {
        setIsPushSubscribed(true);
        setAlert({ type: 'success', message: 'Native system push notifications enabled on this device!' });
      } else {
        setAlert({ type: 'error', message: res.error || 'Failed to enable push notifications.' });
      }
    } catch (e: any) {
      setAlert({ type: 'error', message: e.message || 'Error enabling notifications.' });
    } finally {
      setIsEnablingPush(false);
    }
  };

  // 2. Handle Action (Accept / Decline)
  const handleAction = async (item: NotificationItem, action: 'accept' | 'decline') => {
    try {
      setProcessingId(`${item.id}_${action}`);
      setAlert(null);

      if (item.type === 'TEAM_INVITE') {
        if (action === 'accept') {
          const res = await notificationService.acceptTeamInvite(item.token);
          setAlert({ type: 'success', message: res.message || "Successfully joined the team!" });
          
          // Redirect to team dashboard if accepted
          if (res.teamId) {
            setTimeout(() => {
              router.push(`/dashboard/team/${res.teamId}`);
            }, 1500);
          }
        } else {
          await notificationService.declineTeamInvite(item.token);
          setAlert({ type: 'success', message: "Declined team invitation." });
        }
      } else if (item.type === 'STAFF_INVITE') {
        if (action === 'accept') {
          const res = await notificationService.acceptStaffInvite(item.token);
          setAlert({ type: 'success', message: res.message || "Successfully accepted staff role!" });
          
          // Redirect to event dashboard if accepted
          if (res.eventId) {
            setTimeout(() => {
              router.push(`/events/${res.eventId}`);
            }, 1500);
          }
        } else {
          await notificationService.declineStaffInvite(item.token);
          setAlert({ type: 'success', message: "Declined staff invitation." });
        }
      }

      // Remove the processed notification from state
      setNotifications(prev => prev.filter(n => n.id !== item.id));

    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.response?.data?.error || `Failed to ${action} invitation.`
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={`min-h-screen relative flex flex-col md:flex-row transition-colors duration-300 ${
      isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
    }`}>
      <Sidebar />

      {/* BACKGROUND GLOWS */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="fixed top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[150px] pointer-events-none" />

      {/* MAIN CONTENT */}
      <div className="flex-1 relative overflow-hidden pb-20 min-w-0">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 relative z-10">
          
          {/* HEADER */}
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${
                isDark ? "text-white" : "text-zinc-900"
              }`}>
                Notifications
              </h1>
              <p className={`font-medium text-sm sm:text-base ${
                isDark ? "text-zinc-400" : "text-zinc-500"
              }`}>
                Manage your pending team invitations and staff role invites.
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm shrink-0 ${
              isDark ? "bg-zinc-900 border-white/10 text-indigo-400" : "bg-indigo-50 border-indigo-100 text-indigo-600"
            }`}>
              <Bell className="w-5 h-5" />
            </div>
          </div>

          {/* ALERT MESSAGES */}
          {alert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-2xl border text-sm font-semibold shadow-sm flex items-center justify-between ${
                alert.type === 'success' 
                  ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700') 
                  : (isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-600')
              }`}
            >
              <span>{alert.message}</span>
              <button onClick={() => setAlert(null)} className="opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* SYSTEM PUSH NOTIFICATION PROMPT */}
          {isPushSubscribed === false && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-8 p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                isDark ? "bg-zinc-900/70 border-white/10" : "bg-white border-zinc-200 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${activeAccent.badgeBg} ${activeAccent.text}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Enable System Push Notifications
                  </h4>
                  <p className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-0.5`}>
                    Get WhatsApp-style alerts on your phone or PC for invites, reminders, and updates.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleEnablePush}
                disabled={isEnablingPush}
                size="sm"
                className={`rounded-full px-5 text-xs font-bold text-white transition-all shadow-md ${activeAccent.bg} hover:opacity-90 shrink-0`}
              >
                {isEnablingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Enable Notifications
              </Button>
            </motion.div>
          )}

          {/* LOADING SKELETON */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className={`w-full p-6 rounded-3xl border shadow-sm animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isDark ? "bg-zinc-900/60 border-white/10" : "bg-white border-zinc-200/60"
                }`}>
                  <div className="flex items-center gap-4 w-full">
                    <div className={`w-16 h-16 rounded-2xl shrink-0 ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`} />
                    <div className="space-y-2 w-full max-w-md">
                      <div className={`h-4 rounded w-1/3 ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`} />
                      <div className={`h-5 rounded w-3/4 ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`} />
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    <div className={`h-10 rounded-full w-24 ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`} />
                    <div className={`h-10 rounded-full w-24 ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoading && notifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-center py-20 px-6 border shadow-xl rounded-[2rem] max-w-2xl mx-auto flex flex-col items-center justify-center transition-colors ${
                isDark ? "bg-zinc-900/60 border-white/10" : "bg-white border-zinc-200/60"
              }`}
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${activeAccent.badgeBg} ${activeAccent.text}`}>
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>All caught up!</h3>
              <p className={`font-medium max-w-sm mb-8 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                You have no pending invitations. Join teams or staff members to build amazing things together!
              </p>
              <Link href="/home">
                <Button className={`rounded-full ${activeAccent.bg} text-white hover:opacity-90 px-6 shadow-md ${activeAccent.shadow} font-semibold transition-all`}>
                  Go to Feed
                </Button>
              </Link>
            </motion.div>
          )}

          {/* NOTIFICATION LIST */}
          {!isLoading && notifications.length > 0 && (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {notifications.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className={`w-full p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
                      isDark ? "bg-zinc-900/60 border-white/10" : "bg-white border-zinc-200/60"
                    }`}
                  >
                    {/* Visual indicators */}
                    <div className="flex items-center gap-4">
                      {/* Avatar/Banner Image */}
                      {item.eventBanner ? (
                        <img 
                          src={item.eventBanner} 
                          alt={item.eventName} 
                          className={`w-16 h-16 rounded-2xl object-cover border shadow-sm shrink-0 ${
                            isDark ? "border-white/10" : "border-zinc-100"
                          }`}
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${
                          item.type === 'TEAM_INVITE' 
                            ? 'from-indigo-500 to-purple-600' 
                            : 'from-amber-500 to-orange-600'
                        } flex items-center justify-center text-white shrink-0 shadow-inner`}>
                          {item.type === 'TEAM_INVITE' ? <Users className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
                        </div>
                      )}

                      {/* Content details */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            item.type === 'TEAM_INVITE' 
                              ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700') 
                              : (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-700')
                          }`}>
                            {item.type === 'TEAM_INVITE' ? 'Team Invite' : 'Staff Invite'}
                          </span>
                          <span className="text-zinc-400 font-bold text-xs">
                            {new Date(item.created_at).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>

                        {item.type === 'TEAM_INVITE' ? (
                          <p className={`font-semibold text-base leading-snug ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                            You were invited to join <span className={`font-black ${activeAccent.text}`}>{item.teamName}</span> for <span className={`font-bold ${isDark ? "text-white" : "text-zinc-950"}`}>{item.eventName}</span>.
                          </p>
                        ) : (
                          <p className={`font-semibold text-base leading-snug ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                            You were invited to join the staff for <span className={`font-bold ${isDark ? "text-white" : "text-zinc-950"}`}>{item.eventName}</span> as a <span className="text-amber-500 font-black">{item.roleName}</span>.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex gap-2 shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => handleAction(item, 'decline')}
                        disabled={processingId !== null}
                        className={`rounded-full px-5 font-bold transition-colors ${
                          isDark
                            ? "border-white/10 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {processingId === `${item.id}_decline` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1.5" /> Decline
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => handleAction(item, 'accept')}
                        disabled={processingId !== null}
                        className={`rounded-full ${activeAccent.bg} text-white hover:opacity-90 shadow-sm ${activeAccent.shadow} px-5 font-bold transition-all`}
                      >
                        {processingId === `${item.id}_accept` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1.5" /> Accept
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NotificationsPageContent />
    </Suspense>
  );
}
