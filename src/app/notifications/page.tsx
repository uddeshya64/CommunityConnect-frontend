"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Users,
  Shield,
  ShieldCheck,
  Loader2,
  Inbox,
  Zap,
  CheckCheck,
  Megaphone,
  Ticket,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { notificationService, NotificationItem } from "@/services/notification.service";
import { useAppearance } from "@/components/providers/AppearanceProvider";

const PILLS = ["All", "Unread", "Announcements", "Live Quizzes", "Invites"] as const;
type FilterPill = (typeof PILLS)[number];

const formatNotifTime = (dateStr?: string) => {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function NotificationsPage() {
  const router = useRouter();
  const { activeAccent } = useAppearance();

  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePill, setActivePill] = useState<FilterPill>("All");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const data = await notificationService.getNotifications();
        if (Array.isArray(data)) {
          const lastViewedStr = typeof window !== "undefined" ? localStorage.getItem("cc_notifications_last_viewed") : null;
          const lastViewed = lastViewedStr ? new Date(lastViewedStr).getTime() : 0;

          const mapped = data.map((item: NotificationItem, i: number) => {
            const itemTime = item.created_at ? new Date(item.created_at).getTime() : Date.now();
            const isUnread = item.is_read !== undefined ? !item.is_read : (itemTime > lastViewed);

            return {
              id: String(item.id || i),
              title: item.title || item.message || "Notification",
              sub: item.message || "You have a new update.",
              time: formatNotifTime(item.created_at),
              type: item.type || "INFO",
              isUnread,
              invite: item.type === "TEAM_INVITE" || item.type === "STAFF_INVITE",
              eventName: item.eventName,
              raw: item,
            };
          });
          setNotifications(mapped);
        }
      } catch (e) {
        console.error("Failed to load notifications", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    try {
      localStorage.setItem("cc_notifications_last_viewed", new Date().toISOString());
      window.dispatchEvent(new CustomEvent("cc_notifications_read"));
      await notificationService.markAllRead();
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  };

  const handleAction = async (item: any, action: "accept" | "decline") => {
    setProcessingId(`${item.id}_${action}`);
    try {
      if (item.raw?.token) {
        if (item.type === "TEAM_INVITE") {
          if (action === "accept") {
            const res = await notificationService.acceptTeamInvite(item.raw.token);
            if (res.teamId) router.push(`/dashboard/team/${res.teamId}`);
          } else {
            await notificationService.declineTeamInvite(item.raw.token);
          }
        } else if (item.type === "STAFF_INVITE") {
          if (action === "accept") {
            const res = await notificationService.acceptStaffInvite(item.raw.token);
            if (res.eventId) router.push(`/events/${res.eventId}`);
          } else {
            await notificationService.declineStaffInvite(item.raw.token);
          }
        }
      }
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    } catch (e) {
      console.error("Error processing invite:", e);
    } finally {
      setProcessingId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "LIVE_QUIZ":
        return <Zap className="w-5 h-5 text-amber-400 fill-amber-400/20" />;
      case "ANNOUNCEMENT":
        return <Megaphone className="w-5 h-5 text-cyan-400" />;
      case "TEAM_INVITE":
        return <Users className="w-5 h-5 text-indigo-400" />;
      case "STAFF_INVITE":
        return <Shield className="w-5 h-5 text-purple-400" />;
      case "ROLE_UPDATE":
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case "REGISTRATION":
        return <Ticket className="w-5 h-5 text-blue-400" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getIconBoxStyle = (type: string) => {
    switch (type) {
      case "LIVE_QUIZ":
        return { backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.25)" };
      case "ANNOUNCEMENT":
        return { backgroundColor: "rgba(6, 182, 212, 0.12)", borderColor: "rgba(6, 182, 212, 0.25)" };
      case "TEAM_INVITE":
        return { backgroundColor: "rgba(99, 102, 241, 0.12)", borderColor: "rgba(99, 102, 241, 0.25)" };
      case "STAFF_INVITE":
        return { backgroundColor: "rgba(168, 85, 247, 0.12)", borderColor: "rgba(168, 85, 247, 0.25)" };
      case "ROLE_UPDATE":
        return { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.25)" };
      case "REGISTRATION":
        return { backgroundColor: "rgba(59, 130, 246, 0.12)", borderColor: "rgba(59, 130, 246, 0.25)" };
      default:
        return { backgroundColor: `${activeAccent.hex}18`, borderColor: `${activeAccent.hex}30` };
    }
  };

  const filteredNotifs = useMemo(() => {
    return notifications.filter((n) => {
      if (activePill === "Unread") return n.isUnread;
      if (activePill === "Announcements") return n.type === "ANNOUNCEMENT";
      if (activePill === "Live Quizzes") return n.type === "LIVE_QUIZ";
      if (activePill === "Invites") return n.type === "TEAM_INVITE" || n.type === "STAFF_INVITE";
      return true;
    });
  }, [notifications, activePill]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.isUnread).length;
  }, [notifications]);

  if (!mounted) return null;

  return (
    <AppLayout>
      <div className="w-full max-w-[820px] mx-auto px-4 sm:px-6 py-7 pb-20 flex flex-col gap-5 animate-ccin">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-bricolage text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Notifications
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted)" }}>
              Real-time updates, announcements, live quizzes, and invitations for your events.
            </p>
          </div>
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs font-semibold transition-colors self-start sm:self-auto hover:border-white/30 cursor-pointer"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Mark all read</span>
          </button>
        </div>

        {/* FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PILLS.map((pill) => {
            const isSelected = activePill === pill;
            const badgeCount =
              pill === "Unread"
                ? unreadCount
                : pill === "Announcements"
                ? notifications.filter((n) => n.type === "ANNOUNCEMENT").length
                : pill === "Live Quizzes"
                ? notifications.filter((n) => n.type === "LIVE_QUIZ").length
                : pill === "Invites"
                ? notifications.filter((n) => n.type === "TEAM_INVITE" || n.type === "STAFF_INVITE").length
                : notifications.length;

            return (
              <button
                key={pill}
                onClick={() => setActivePill(pill)}
                className="h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                style={
                  isSelected
                    ? { background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" }
                    : { background: "var(--input)", color: "var(--muted)", borderColor: "var(--border)" }
                }
              >
                <span>{pill}</span>
                {badgeCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-black/20 text-current" : "bg-white/10 text-current"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* NOTIFICATIONS LIST */}
        <div className="flex flex-col gap-2.5">
          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3].map((skeleton) => (
                <div
                  key={skeleton}
                  className="p-4 sm:p-4.5 rounded-2xl border animate-pulse flex items-start gap-3.5"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div className="w-11 h-11 rounded-xl bg-white/5 shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="w-1/3 h-4 rounded bg-white/10" />
                    <div className="w-3/4 h-3 rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifs.length > 0 ? (
            filteredNotifs.map((n) => (
              <div
                key={n.id}
                className="group flex items-start gap-3.5 p-4 sm:p-4.5 rounded-2xl border transition-all shadow-sm hover:border-white/20"
                style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}
              >
                {/* Unread indicator dot */}
                <span
                  className={`w-2 h-2 mt-4 rounded-full shrink-0 transition-opacity ${
                    n.isUnread ? "bg-indigo-500 shadow-[0_0_8px_#6366f1]" : "opacity-0"
                  }`}
                  style={n.isUnread ? { backgroundColor: activeAccent.hex } : undefined}
                />

                {/* Accent Icon Container */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                  style={getIconBoxStyle(n.type)}
                >
                  {getIcon(n.type)}
                </div>

                {/* Notification Body */}
                <div className="flex-1 min-w-0">
                  {n.eventName && (
                    <div className="inline-block text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md mb-1.5" style={{ background: "var(--input)", color: "var(--muted)" }}>
                      {n.eventName}
                    </div>
                  )}

                  <div className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
                    {n.title}
                  </div>

                  <div className="text-xs mt-1 leading-relaxed whitespace-pre-line" style={{ color: "var(--muted)" }}>
                    {n.sub}
                  </div>

                  {/* ACTION BUTTON: LIVE QUIZ */}
                  {n.type === "LIVE_QUIZ" && (
                    <div className="mt-3">
                      <button
                        onClick={() => router.push(n.raw?.url || `/events/${n.raw?.eventId}/quiz/${n.raw?.quizId}`)}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-white text-xs font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${activeAccent.hex}, ${activeAccent.gradientEnd || "#8b5cf6"})`,
                        }}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>🎯 Join Live Quiz Now</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                      </button>
                    </div>
                  )}

                  {/* ACTION BUTTON: ANNOUNCEMENT */}
                  {n.type === "ANNOUNCEMENT" && (
                    <div className="mt-3">
                      <button
                        onClick={() => router.push(n.raw?.url || `/events/${n.raw?.eventId}`)}
                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border text-xs font-semibold transition-colors hover:border-white/30 cursor-pointer"
                        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <Megaphone className="w-3.5 h-3.5 text-cyan-400" />
                        <span>View Event Details</span>
                        <ArrowRight className="w-3 h-3 ml-0.5 opacity-60" />
                      </button>
                    </div>
                  )}

                  {/* ACTION BUTTON: REGISTRATION */}
                  {n.type === "REGISTRATION" && (
                    <div className="mt-3">
                      <button
                        onClick={() => router.push(n.raw?.url || `/events/${n.raw?.eventId}`)}
                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border text-xs font-semibold transition-colors hover:border-white/30 cursor-pointer"
                        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <Ticket className="w-3.5 h-3.5 text-blue-400" />
                        <span>View Pass & QR Code</span>
                        <ArrowRight className="w-3 h-3 ml-0.5 opacity-60" />
                      </button>
                    </div>
                  )}

                  {/* ACTION BUTTON: ROLE UPDATE */}
                  {n.type === "ROLE_UPDATE" && (
                    <div className="mt-3">
                      <button
                        onClick={() => router.push(n.raw?.url || `/events/${n.raw?.eventId}`)}
                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border text-xs font-semibold transition-colors hover:border-white/30 cursor-pointer"
                        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Open Staff Portal</span>
                        <ArrowRight className="w-3 h-3 ml-0.5 opacity-60" />
                      </button>
                    </div>
                  )}

                  {/* ACTION BUTTONS: TEAM OR STAFF INVITE */}
                  {n.invite && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleAction(n, "accept")}
                        disabled={!!processingId}
                        className="h-8 px-3.5 rounded-xl text-white text-xs font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${activeAccent.hex}, ${activeAccent.gradientEnd || "#8b5cf6"})`,
                        }}
                      >
                        {processingId === `${n.id}_accept` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Accept & join"
                        )}
                      </button>
                      <button
                        onClick={() => handleAction(n, "decline")}
                        disabled={!!processingId}
                        className="h-8 px-3 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer hover:border-white/30"
                        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--muted)" }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                {/* Time */}
                <span className="font-mono text-[11px] shrink-0 whitespace-nowrap" style={{ color: "var(--subtle)" }}>
                  {n.time}
                </span>
              </div>
            ))
          ) : (
            <div
              className="p-12 rounded-2xl border border-dashed text-center flex flex-col items-center justify-center gap-2"
              style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}
            >
              <Inbox className="w-8 h-8 opacity-40 mb-1" />
              <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {activePill === "All"
                  ? "You're all caught up"
                  : `No ${activePill.toLowerCase()} found`}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                When you receive invitations, live quizzes, or event announcements, they will appear here.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
