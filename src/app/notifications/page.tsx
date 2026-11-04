"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  X,
  Users,
  Shield,
  Loader2,
  Inbox,
  Zap,
  CheckCheck,
  Megaphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { notificationService, NotificationItem } from "@/services/notification.service";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { pushNotificationService } from "@/services/pushNotification.service";

export default function NotificationsPage() {
  const router = useRouter();
  const { activeAccent } = useAppearance();

  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePill, setActivePill] = useState<"All" | "Unread" | "Announcements">("All");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const fetchNotifications = async () => {
      try {
        const data = await notificationService.getNotifications();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item: any, i: number) => ({
            id: String(item.id || i),
            title: item.title || item.message || "Notification",
            sub: item.description || item.message || "You have a new update.",
            time: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
            type: item.type || "INFO",
            isUnread: !item.is_read,
            invite: item.type === "TEAM_INVITE" || item.type === "STAFF_INVITE",
            raw: item,
          }));
          setNotifications(mapped);
        }
      } catch (e) {
        // Fallback to sample data
      }
    };
    fetchNotifications();
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    try {
      localStorage.setItem("cc_notifications_last_viewed", new Date().toISOString());
      window.dispatchEvent(new CustomEvent("cc_notifications_read"));
    } catch (e) {}
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
      // Done
    } finally {
      setProcessingId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "TEAM_INVITE":
        return <Users className="w-5 h-5 text-indigo-400" />;
      case "STAFF_INVITE":
        return <Shield className="w-5 h-5 text-indigo-400" />;
      case "ANNOUNCEMENT":
        return <Megaphone className="w-5 h-5 text-amber-400" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-400" />;
    }
  };

  const filteredNotifs = useMemo(() => {
    return notifications.filter((n) => {
      if (activePill === "Unread") return n.isUnread;
      if (activePill === "Announcements") return n.type === "ANNOUNCEMENT";
      return true;
    });
  }, [notifications, activePill]);

  if (!mounted) return null;

  return (
    <AppLayout>
      <div className="w-full max-w-[820px] mx-auto px-4 sm:px-6 py-7 pb-20 flex flex-col gap-5 animate-ccin">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <h1 className="font-bricolage text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Notifications
          </h1>
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs font-semibold transition-colors self-start sm:self-auto" style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        </div>

        {/* FILTER PILLS */}
        <div className="flex items-center gap-2">
          {(["All", "Unread", "Announcements"] as const).map((pill) => {
            const isSelected = activePill === pill;
            return (
              <button
                key={pill}
                onClick={() => setActivePill(pill)}
                className="h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all"
                style={
                  isSelected
                    ? { background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" }
                    : { background: "var(--input)", color: "var(--muted)", borderColor: "var(--border)" }
                }
              >
                {pill}
              </button>
            );
          })}
        </div>

        {/* NOTIFICATIONS LIST */}
        <div className="flex flex-col gap-2.5">
          {filteredNotifs.length > 0 ? (
            filteredNotifs.map((n) => (
              <div
                key={n.id}
                className="group flex items-start gap-3.5 p-4 sm:p-4.5 rounded-2xl border transition-all shadow-sm" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}
              >
                {/* Unread dot */}
                <span
                  className={`w-2 h-2 mt-4 rounded-full shrink-0 transition-opacity ${
                    n.isUnread ? "bg-indigo-500 shadow-[0_0_8px_#6366f1]" : "opacity-0"
                  }`}
                  style={n.isUnread ? { backgroundColor: activeAccent.hex } : undefined}
                />

                {/* Accent Icon Container */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20"
                  style={{ backgroundColor: `${activeAccent.hex}18` }}
                >
                  {getIcon(n.type)}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
                    {n.title}
                  </div>
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                    {n.sub}
                  </div>

                  {/* Inline Action Buttons (if invite) */}
                  {n.invite && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleAction(n, "accept")}
                        disabled={!!processingId}
                        className="h-8 px-3.5 rounded-lg text-white text-xs font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50"
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
                        className="h-8 px-3 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50" style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--muted)" }}
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
            <div className="p-12 rounded-2xl border border-dashed text-center text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}>
              You&apos;re all caught up.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
