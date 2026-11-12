"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  Check,
  Sparkles,
  BookmarkCheck,
  FolderOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import BackButton from "@/components/ui/BackButton";
import { notificationService, NotificationItem } from "@/services/notification.service";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useUser } from "@/components/providers/UserProvider";
import { io, Socket } from "socket.io-client";
import { getSocketBaseUrl } from "@/lib/socket";
import {
  listLocalDraftNotifications,
  markAllLocalDraftNotificationsRead,
  markLocalDraftNotificationRead,
  type LocalDraftNotificationItem,
} from "@/lib/eventDraftStorage";

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

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const getStoredReadIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("cc_read_notification_ids");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const addStoredReadId = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredReadIds();
    current.add(id);
    localStorage.setItem("cc_read_notification_ids", JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error("Failed to store read id", e);
  }
};

const getMarkedAllReadAt = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    const str = localStorage.getItem("cc_notifications_marked_all_read_at");
    return str ? new Date(str).getTime() : 0;
  } catch {
    return 0;
  }
};

export default function NotificationsPage() {
  const router = useRouter();
  const { activeAccent, isDark } = useAppearance();
  const { profile } = useUser();

  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePill, setActivePill] = useState<FilterPill>("All");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Core fetch function (supports silent background revalidation without full-page spinner)
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await notificationService.getNotifications();
      if (Array.isArray(data)) {
        const readIdsSet = getStoredReadIds();
        const markedAllReadAt = getMarkedAllReadAt();

        let hasNewIncoming = false;

        const mapped = data.map((item: NotificationItem, i: number) => {
          const itemId = String(item.id || i);
          const itemTime = item.created_at ? new Date(item.created_at).getTime() : Date.now();

          // Check if this item is recognized as read
          const isManuallyRead = readIdsSet.has(itemId);
          const isBulkRead = markedAllReadAt > 0 && itemTime <= markedAllReadAt;
          const isBackendRead = item.is_read === true;

          const isUnread = !isManuallyRead && !isBulkRead && !isBackendRead;

          // Detect brand new notifications that arrived live
          if (!isInitialLoadRef.current && isUnread && !seenIdsRef.current.has(itemId)) {
            hasNewIncoming = true;
          }

          seenIdsRef.current.add(itemId);

          return {
            id: itemId,
            title: item.title || item.message || "Notification",
            sub: item.message || "You have a new update.",
            time: formatNotifTime(item.created_at),
            rawTime: item.created_at,
            type: item.type || "INFO",
            isUnread,
            invite: item.type === "TEAM_INVITE" || item.type === "STAFF_INVITE",
            eventName: item.eventName,
            eventBanner: item.eventBanner,
            authorName: item.authorName,
            raw: item,
          };
        });

        if (hasNewIncoming) {
          setLiveAlert("New notification just arrived live!");
          setTimeout(() => setLiveAlert(null), 5000);
        }

        setNotifications(mapped);
        isInitialLoadRef.current = false;
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Initial mount fetch
  useEffect(() => {
    setMounted(true);
    fetchNotifications(false);
  }, [fetchNotifications]);

  // Real-time Live Connection & Polling (Shows new notifications live while on this page)
  useEffect(() => {
    let notifSocket: Socket | null = null;
    let quizSocket: Socket | null = null;

    try {
      const socketUrl = getSocketBaseUrl();

      notifSocket = io(`${socketUrl}/notifications`, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      if (profile?.id) {
        notifSocket.emit("join_user", { userId: profile.id });
      }

      notifSocket.on("notification", (data) => {
        if (data?.title) {
          setLiveAlert(`🔔 Live: ${data.title}`);
          setTimeout(() => setLiveAlert(null), 5000);
        }
        fetchNotifications(true);
      });

      quizSocket = io(`${socketUrl}/quiz`, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      quizSocket.on("quiz_started", (data) => {
        setLiveAlert("⚡ A Live Quiz just started!");
        setTimeout(() => setLiveAlert(null), 5000);
        fetchNotifications(true);
      });
    } catch {
      // Socket fallback handled by polling
    }

    // Custom DOM event listener
    const handleCustomTrigger = () => {
      fetchNotifications(true);
    };
    window.addEventListener("cc_trigger_notification", handleCustomTrigger);

    // Live background polling every 6 seconds while the page is active
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchNotifications(true);
      }
    }, 6000);

    // Live refetch when tab becomes visible or focused
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      if (notifSocket) notifSocket.disconnect();
      if (quizSocket) quizSocket.disconnect();
      window.removeEventListener("cc_trigger_notification", handleCustomTrigger);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [profile?.id, fetchNotifications]);

  const markAllRead = async () => {
    const now = new Date().toISOString();
    localStorage.setItem("cc_notifications_marked_all_read_at", now);
    localStorage.setItem("cc_notifications_last_viewed", now);
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem("cc_read_notification_ids", JSON.stringify(allIds));
    window.dispatchEvent(new CustomEvent("cc_notifications_read"));
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    markAllLocalDraftNotificationsRead();
    setLocalDraftNotifs((prev) => prev.map((n) => ({ ...n, isUnread: false })));

    try {
      await notificationService.markAllRead();
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  };

  const markAsRead = (item: any) => {
    if (!item.isUnread) return;
    if (item.type === "DRAFT_SAVED") {
      markLocalDraftNotificationRead(item.id);
      setLocalDraftNotifs((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
      );
      return;
    }
    addStoredReadId(item.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
    );

    const remainingUnread = notifications.filter((n) => n.id !== item.id && n.isUnread).length;
    if (remainingUnread === 0) {
      const now = new Date().toISOString();
      localStorage.setItem("cc_notifications_marked_all_read_at", now);
      localStorage.setItem("cc_notifications_last_viewed", now);
      window.dispatchEvent(new CustomEvent("cc_notifications_read"));
    }
  };

  const handleAction = async (item: any, action: "accept" | "decline", e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(item);
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

  const handleItemClick = (n: any) => {
    markAsRead(n);

    const targetUrl =
      n.raw?.url ||
      (n.type === "LIVE_QUIZ" && n.raw?.eventId && n.raw?.quizId
        ? `/events/${n.raw.eventId}/quiz/${n.raw.quizId}`
        : n.raw?.eventId
        ? `/events/${n.raw.eventId}`
        : null);

    if (targetUrl) {
      router.push(targetUrl);
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
      case "EVENT_REMINDER":
        return <Bell className="w-5 h-5 text-emerald-400" />;
      case "DRAFT_SAVED":
        return <BookmarkCheck className="w-5 h-5" style={{ color: "var(--accent)" }} />;
      default:
        return <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} />;
    }
  };

  const getIconBoxStyle = (type: string, isNew: boolean = false) => {
    if (isNew) {
      return isDark
        ? {
            backgroundColor: "color-mix(in srgb, var(--accent) 22%, var(--input))",
            borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)",
            boxShadow: "0 2px 10px -2px color-mix(in srgb, var(--accent) 30%, transparent)",
          }
        : {
            backgroundColor: "color-mix(in srgb, var(--accent) 22%, #ffffff)",
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            boxShadow: "0 2px 10px -2px color-mix(in srgb, var(--accent) 25%, transparent)",
          };
    }
    switch (type) {
      case "LIVE_QUIZ":
        return { backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.28)" };
      case "ANNOUNCEMENT":
        return { backgroundColor: "rgba(6, 182, 212, 0.12)", borderColor: "rgba(6, 182, 212, 0.28)" };
      case "TEAM_INVITE":
        return { backgroundColor: "rgba(99, 102, 241, 0.12)", borderColor: "rgba(99, 102, 241, 0.28)" };
      case "STAFF_INVITE":
        return { backgroundColor: "rgba(168, 85, 247, 0.12)", borderColor: "rgba(168, 85, 247, 0.28)" };
      case "ROLE_UPDATE":
        return { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.28)" };
      case "REGISTRATION":
        return { backgroundColor: "rgba(59, 130, 246, 0.12)", borderColor: "rgba(59, 130, 246, 0.28)" };
      case "EVENT_REMINDER":
        return { backgroundColor: "rgba(16, 185, 129, 0.14)", borderColor: "rgba(16, 185, 129, 0.35)" };
      case "DRAFT_SAVED":
        return {
          backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
          borderColor: "color-mix(in srgb, var(--accent) 32%, transparent)",
        };
      default:
        return { backgroundColor: "var(--input)", borderColor: "var(--border)" };
    }
  };

  const [localDraftNotifs, setLocalDraftNotifs] = useState<LocalDraftNotificationItem[]>([]);

  useEffect(() => {
    const syncLocalNotifs = () => {
      setLocalDraftNotifs(listLocalDraftNotifications());
    };
    syncLocalNotifs();
    window.addEventListener("cc_drafts_updated", syncLocalNotifs);
    window.addEventListener("cc_trigger_notification", syncLocalNotifs);
    window.addEventListener("storage", syncLocalNotifs);
    return () => {
      window.removeEventListener("cc_drafts_updated", syncLocalNotifs);
      window.removeEventListener("cc_trigger_notification", syncLocalNotifs);
      window.removeEventListener("storage", syncLocalNotifs);
    };
  }, []);

  const combinedNotifs = useMemo(() => {
    const mappedDrafts = localDraftNotifs.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      sub: d.sub,
      eventName: d.eventName,
      authorName: null,
      time: formatNotifTime(d.rawTime),
      rawTime: d.rawTime,
      isUnread: d.isUnread,
      raw: { url: d.url, draftId: d.draftId },
    }));
    return [...mappedDrafts, ...notifications].sort(
      (a, b) => new Date(b.rawTime || 0).getTime() - new Date(a.rawTime || 0).getTime()
    );
  }, [localDraftNotifs, notifications]);

  const filteredNotifs = useMemo(() => {
    return combinedNotifs.filter((n) => {
      if (activePill === "Unread") return n.isUnread;
      if (activePill === "Announcements") return n.type === "ANNOUNCEMENT";
      if (activePill === "Live Quizzes") return n.type === "LIVE_QUIZ";
      if (activePill === "Invites") return n.type === "TEAM_INVITE" || n.type === "STAFF_INVITE";
      return true;
    });
  }, [combinedNotifs, activePill]);

  const unreadCount = useMemo(() => {
    return combinedNotifs.filter((n) => n.isUnread).length;
  }, [combinedNotifs]);

  // Instagram-style sections: New (Unread) | Today | Earlier
  const { newNotifs, todayNotifs, earlierNotifs } = useMemo(() => {
    const unread: any[] = [];
    const today: any[] = [];
    const earlier: any[] = [];

    filteredNotifs.forEach((n) => {
      if (n.isUnread) {
        unread.push(n);
      } else if (isToday(n.rawTime)) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { newNotifs: unread, todayNotifs: today, earlierNotifs: earlier };
  }, [filteredNotifs]);

  if (!mounted) return null;

  // Single Notification Card Renderer
  const renderNotificationCard = (n: any) => {
    const isNew = n.isUnread;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        key={n.id}
        onClick={() => handleItemClick(n)}
        className={`group relative flex items-start gap-3.5 p-4 sm:p-4.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
          isNew
            ? "shadow-md hover:shadow-lg"
            : "hover:border-white/20 hover:bg-white/[0.015]"
        }`}
        style={
          isNew
            ? isDark
              ? {
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--card)) 0%, color-mix(in srgb, var(--accent) 12%, var(--card)) 100%)",
                  borderColor: "color-mix(in srgb, var(--accent) 50%, var(--border))",
                  borderLeftWidth: "5px",
                  borderLeftColor: "var(--accent)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 6px 24px -2px color-mix(in srgb, var(--accent) 25%, transparent)",
                }
              : {
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, #ffffff) 0%, color-mix(in srgb, var(--accent) 10%, #ffffff) 100%)",
                  borderColor: "color-mix(in srgb, var(--accent) 45%, #cbd5e1)",
                  borderLeftWidth: "5px",
                  borderLeftColor: "var(--accent)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 6px 20px -2px color-mix(in srgb, var(--accent) 22%, transparent)",
                }
            : {
                background: "var(--card)",
                borderColor: "var(--border)",
                borderLeftWidth: "1px",
                borderLeftColor: "var(--border)",
                backdropFilter: "blur(20px)",
              }
        }
      >
        {/* Left Category Icon */}
        <div
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105"
          style={getIconBoxStyle(n.type, isNew)}
        >
          {getIcon(n.type)}
        </div>

        {/* Middle: Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {n.eventName && (
              <span
                className="inline-block text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md"
                style={
                  isNew
                    ? isDark
                      ? {
                          background: "color-mix(in srgb, var(--accent) 22%, var(--input))",
                          color: "var(--accent)",
                          border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
                        }
                      : {
                          background: "color-mix(in srgb, var(--accent) 20%, #ffffff)",
                          color: "color-mix(in srgb, var(--accent) 85%, #000000)",
                          border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
                        }
                    : {
                        background: "var(--input)",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {n.eventName}
              </span>
            )}
            {n.authorName && (
              <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                by {n.authorName}
              </span>
            )}
          </div>

          <div
            className={`text-sm leading-snug transition-colors ${
              isNew ? "font-bold text-zinc-950 dark:text-zinc-50" : "font-semibold"
            }`}
            style={!isNew ? { color: "var(--text)" } : undefined}
          >
            {n.title}
          </div>

          <div className="text-xs mt-1 leading-relaxed whitespace-pre-line" style={{ color: "var(--muted)" }}>
            {n.sub}
          </div>

          {/* ACTION BUTTON: LIVE QUIZ */}
          {n.type === "LIVE_QUIZ" && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(n);
                  router.push(n.raw?.url || `/events/${n.raw?.eventId}/quiz/${n.raw?.quizId}`);
                }}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-white text-xs font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))",
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
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(n);
                  router.push(n.raw?.url || `/events/${n.raw?.eventId}`);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border text-xs font-semibold transition-colors hover:border-white/30 cursor-pointer shadow-2xs"
                style={
                  isNew && !isDark
                    ? { background: "#ffffff", borderColor: "color-mix(in srgb, var(--accent) 40%, #cbd5e1)", color: "var(--text)" }
                    : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
                }
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
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(n);
                  router.push(n.raw?.url || `/events/${n.raw?.eventId}`);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border text-xs font-semibold transition-colors hover:border-white/30 cursor-pointer shadow-2xs"
                style={
                  isNew && !isDark
                    ? { background: "#ffffff", borderColor: "color-mix(in srgb, var(--accent) 40%, #cbd5e1)", color: "var(--text)" }
                    : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
                }
              >
                <Ticket className="w-3.5 h-3.5 text-blue-400" />
                <span>View Pass & QR Code</span>
                <ArrowRight className="w-3 h-3 ml-0.5 opacity-60" />
              </button>
            </div>
          )}

          {/* ACTION BUTTON: DRAFT SAVED */}
          {n.type === "DRAFT_SAVED" && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(n);
                  router.push(n.raw?.url || "/events/create?folder=drafts");
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border text-xs font-semibold transition-colors hover:border-white/30 cursor-pointer shadow-2xs"
                style={
                  isNew && !isDark
                    ? { background: "#ffffff", borderColor: "color-mix(in srgb, var(--accent) 40%, #cbd5e1)", color: "var(--text)" }
                    : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
                }
              >
                <FolderOpen className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                <span>Open Saved Drafts Folder</span>
                <ArrowRight className="w-3 h-3 ml-0.5 opacity-60" />
              </button>
            </div>
          )}

          {/* ACTION BUTTON: ROLE UPDATE */}
          {n.type === "ROLE_UPDATE" && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(n);
                  router.push(n.raw?.url || `/events/${n.raw?.eventId}`);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border text-xs font-semibold transition-colors hover:border-white/30 cursor-pointer shadow-2xs"
                style={
                  isNew && !isDark
                    ? { background: "#ffffff", borderColor: "color-mix(in srgb, var(--accent) 40%, #cbd5e1)", color: "var(--text)" }
                    : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
                }
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
                onClick={(e) => handleAction(n, "accept", e)}
                disabled={!!processingId}
                className="h-8 px-3.5 rounded-xl text-white text-xs font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))",
                }}
              >
                {processingId === `${n.id}_accept` ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Accept & join"
                )}
              </button>
              <button
                onClick={(e) => handleAction(n, "decline", e)}
                disabled={!!processingId}
                className="h-8 px-3 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer hover:border-white/30"
                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Decline
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Time, Thumbnail (Instagram style) & Unread Dot */}
        <div className="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] whitespace-nowrap" style={{ color: "var(--subtle)" }}>
              {n.time}
            </span>

            {/* Glowing Unread Indicator Dot */}
            {isNew && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                style={{
                  backgroundColor: "var(--accent)",
                  boxShadow: "0 0 12px var(--accent)",
                }}
                title="New notification"
              />
            )}
          </div>

          {/* Instagram-style Event Banner Thumbnail */}
          {n.eventBanner ? (
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-sm mt-auto">
              <img
                src={n.eventBanner}
                alt={n.eventName || "Event thumbnail"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          ) : (
            <ArrowRight className="w-4 h-4 mt-auto text-zinc-400 opacity-0 group-hover:opacity-70 transition-opacity" />
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[820px] mx-auto px-4 sm:px-6 py-7 pb-20 flex flex-col gap-6 animate-ccin">
        {/* TOP BAR / BACK NAVIGATION & MARK ALL AS READ */}
        <div className="flex items-center justify-between gap-3">
          <BackButton fallbackHref="/home" label="Back" />
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:border-white/30"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Mark all read</span>
          </button>
        </div>

        {/* HEADER */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-bricolage text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm"
                style={{
                  background: "color-mix(in srgb, var(--accent) 18%, transparent)",
                  color: "var(--accent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--muted)" }}>
            Real-time updates, event announcements, live quizzes, and invitations.
          </p>
        </div>

        {/* LIVE TOAST BANNER (when new notification arrives while user is on this page) */}
        <AnimatePresence>
          {liveAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm"
              style={{
                background: isDark
                  ? "color-mix(in srgb, var(--accent) 20%, var(--card))"
                  : "color-mix(in srgb, var(--accent) 16%, #ffffff)",
                border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
                color: "var(--text)",
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
                <span>{liveAlert}</span>
              </div>
              <span
                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--accent)", color: "#ffffff" }}
              >
                Live
              </span>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* NOTIFICATIONS LIST (Instagram Sections) */}
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3].map((skeleton) => (
                <div
                  key={skeleton}
                  className="p-4 sm:p-4.5 rounded-2xl border animate-pulse flex items-start gap-3.5"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div className="w-11 h-11 rounded-2xl bg-white/5 shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="w-1/3 h-4 rounded bg-white/10" />
                    <div className="w-3/4 h-3 rounded bg-white/5" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0" />
                </div>
              ))}
            </div>
          ) : filteredNotifs.length > 0 ? (
            <>
              {/* SECTION: NEW (Unread with Pastel Accent wash) */}
              {newNotifs.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--accent)" }}>
                        New
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 20%, transparent)",
                          color: "var(--accent)",
                          border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                        }}
                      >
                        {newNotifs.length}
                      </span>
                    </div>
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold hover:underline cursor-pointer flex items-center gap-1 transition-opacity opacity-85 hover:opacity-100"
                      style={{ color: "var(--accent)" }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark all as read</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <AnimatePresence>
                      {newNotifs.map((n) => renderNotificationCard(n))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* SECTION: TODAY (Read items from today, plain as they are now) */}
              {todayNotifs.length > 0 && activePill !== "Unread" && (
                <div className="flex flex-col gap-2.5">
                  <div className="px-1 pt-1">
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--muted)" }}>
                      Today
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <AnimatePresence>
                      {todayNotifs.map((n) => renderNotificationCard(n))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* SECTION: EARLIER (Older read items, plain as they are now) */}
              {earlierNotifs.length > 0 && activePill !== "Unread" && (
                <div className="flex flex-col gap-2.5">
                  <div className="px-1 pt-1">
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--muted)" }}>
                      Earlier
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <AnimatePresence>
                      {earlierNotifs.map((n) => renderNotificationCard(n))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* EMPTY STATE */
            <div
              className="p-12 rounded-2xl border border-dashed text-center flex flex-col items-center justify-center gap-2"
              style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-base font-bold" style={{ color: "var(--text)" }}>
                {activePill === "All"
                  ? "You're all caught up"
                  : `No ${activePill.toLowerCase()} found`}
              </div>
              <div className="text-xs max-w-sm" style={{ color: "var(--muted)" }}>
                {activePill === "Unread"
                  ? "You have no unread notifications right now. Everything is up to date!"
                  : "When you receive invitations, live quizzes, or event announcements, they will appear here."}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
