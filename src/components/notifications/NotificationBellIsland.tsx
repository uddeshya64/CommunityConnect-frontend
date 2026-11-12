"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  Megaphone,
  Radio,
  Users,
  ShieldCheck,
  Ticket,
  Sparkles,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useUser } from "@/components/providers/UserProvider";
import { notificationService, NotificationItem } from "@/services/notification.service";
import { io, Socket } from "socket.io-client";
import { getSocketBaseUrl } from "@/lib/socket";

export interface ActiveNotificationPayload {
  id?: string;
  type?: string;
  title: string;
  message?: string;
  url?: string;
  created_at?: string;
}

interface NotificationBellIslandProps {
  href?: string;
  className?: string;
}

const NOTIFICATION_DURATION_MS = 7000;
const TOAST_DURATION_MS = 4500;

export default function NotificationBellIsland({
  href = "/notifications",
  className = "",
}: NotificationBellIslandProps) {
  const { isDark, activeAccent } = useAppearance();
  const { profile } = useUser();
  const router = useRouter();

  const [hasNotifications, setHasNotifications] = useState(false);
  const [activeNotification, setActiveNotification] = useState<ActiveNotificationPayload | null>(null);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeDurationRef = useRef<number>(NOTIFICATION_DURATION_MS);
  const remainingTimeRef = useRef<number>(NOTIFICATION_DURATION_MS);
  const startTimeRef = useRef<number>(Date.now());
  const isInitialMountRef = useRef(true);

  const closeIsland = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setActiveNotification(null);
  }, []);

  // Trigger Dynamic Island pop-up with auto-dismiss countdown
  const triggerIslandNotification = useCallback((notif: ActiveNotificationPayload) => {
    // Avoid re-triggering the exact same notification in the same session
    if (notif.id && seenIdsRef.current.has(notif.id)) {
      return;
    }
    if (notif.id) {
      seenIdsRef.current.add(notif.id);
    }

    const isToast = Boolean(notif.type?.startsWith("TOAST_"));
    const duration = isToast ? TOAST_DURATION_MS : NOTIFICATION_DURATION_MS;

    setActiveNotification(notif);
    if (!isToast) {
      setHasNotifications(true);
    }
    setProgress(100);
    activeDurationRef.current = duration;
    remainingTimeRef.current = duration;
    startTimeRef.current = Date.now();

    // Clear any existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    // Smooth countdown progress ticker
    const intervalTick = 50;
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (intervalTick / duration) * 100;
        return next > 0 ? next : 0;
      });
    }, intervalTick);

    // Auto-dismiss after configured duration
    timerRef.current = setTimeout(() => {
      closeIsland();
    }, duration);
  }, [closeIsland]);

  // Pause on hover
  const handleMouseEnter = () => {
    setIsPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  // Resume when mouse leaves
  const handleMouseLeave = () => {
    setIsPaused(false);
    if (remainingTimeRef.current <= 0) {
      closeIsland();
      return;
    }

    startTimeRef.current = Date.now();
    const intervalTick = 50;
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (intervalTick / remainingTimeRef.current) * (prev || 100);
        return next > 0 ? next : 0;
      });
    }, intervalTick);

    timerRef.current = setTimeout(() => {
      closeIsland();
    }, remainingTimeRef.current);
  };

  // Click on island card
  const handleIslandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeNotification?.url && activeNotification?.type?.startsWith("TOAST_")) {
      closeIsland();
      return;
    }
    const targetUrl = activeNotification?.url || href;
    closeIsland();
    router.push(targetUrl);
  };

  // 1. Initial & Polling Unread Check
  const checkNotifications = useCallback(async () => {
    try {
      const notifs = await notificationService.getNotifications();
      if (!Array.isArray(notifs)) return;

      const lastViewedStr =
        typeof window !== "undefined"
          ? localStorage.getItem("cc_notifications_last_viewed")
          : null;
      const lastViewedTime = lastViewedStr ? new Date(lastViewedStr).getTime() : 0;

      // Filter unread notifications
      const unreadList = notifs.filter((n: any) => {
        const notifTime = new Date(n.created_at || Date.now()).getTime();
        return notifTime > lastViewedTime;
      });

      setHasNotifications(unreadList.length > 0);

      // On first load, seed seen IDs so we don't spam popups for old items
      if (isInitialMountRef.current) {
        notifs.forEach((n) => {
          if (n.id) seenIdsRef.current.add(String(n.id));
        });
        isInitialMountRef.current = false;
        return;
      }

      // If a brand new notification arrived that we haven't seen in this session, pop it up!
      if (unreadList.length > 0) {
        const newest = unreadList[0];
        if (newest && newest.id && !seenIdsRef.current.has(String(newest.id))) {
          triggerIslandNotification({
            id: String(newest.id),
            type: newest.type,
            title: newest.title || "New Notification",
            message: newest.message || `Update from ${newest.eventName || "Eventrix"}`,
            url: newest.url || href,
            created_at: newest.created_at,
          });
        }
      }
    } catch {
      // Ignore network errors in background polling
    }
  }, [href, triggerIslandNotification]);

  useEffect(() => {
    checkNotifications();

    // Polling every 15 seconds when active
    const pollTimer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        checkNotifications();
      }
    }, 15000);

    return () => clearInterval(pollTimer);
  }, [checkNotifications]);

  // 2. Listen to custom DOM events and Service Worker postMessages
  useEffect(() => {
    // Custom DOM event
    const handleCustomTrigger = (event: Event) => {
      const customEvent = event as CustomEvent<ActiveNotificationPayload>;
      if (customEvent.detail) {
        triggerIslandNotification(customEvent.detail);
      }
    };

    // Global notifications read event
    const handleNotificationsRead = () => {
      setHasNotifications(false);
      closeIsland();
    };

    // Service Worker message listener
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_RECEIVED" && event.data.notification) {
        triggerIslandNotification(event.data.notification);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("cc_trigger_notification", handleCustomTrigger);
      window.addEventListener("cc_notifications_read", handleNotificationsRead);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
      }

      // Attach test helper to window for easy debugging/demo
      (window as any).triggerTestNotification = (custom?: Partial<ActiveNotificationPayload>) => {
        triggerIslandNotification({
          id: `test_${Date.now()}`,
          type: custom?.type || "ANNOUNCEMENT",
          title: custom?.title || "📢 Keynote Starting Soon!",
          message: custom?.message || "Join Hall A for the AI & Future of Tech keynote session.",
          url: custom?.url || "/notifications",
          ...custom,
        });
      };
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cc_trigger_notification", handleCustomTrigger);
        window.removeEventListener("cc_notifications_read", handleNotificationsRead);
        if (navigator.serviceWorker) {
          navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
        }
      }
    };
  }, [triggerIslandNotification, closeIsland]);

  // 3. Instant Real-time WebSocket Connection (< 50ms) for Direct Device Notifications
  useEffect(() => {
    let quizSocket: Socket | null = null;
    let notifSocket: Socket | null = null;

    try {
      const socketUrl = getSocketBaseUrl();

      // Direct Notification Namespace: instant push (< 50ms) for announcements, passes, staff alerts, test alerts
      notifSocket = io(`${socketUrl}/notifications`, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      const currentUserId = profile?.id;
      if (currentUserId) {
        notifSocket.emit("join_user", { userId: currentUserId });
      }

      notifSocket.on("notification", (data: ActiveNotificationPayload) => {
        if (data) {
          triggerIslandNotification(data);
        }
      });

      // Live Quiz Arena Alerts
      quizSocket = io(`${socketUrl}/quiz`, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      quizSocket.on("quiz_started", (data: { sessionId: number; quizId: number; eventId: number }) => {
        triggerIslandNotification({
          id: `quiz_${data.quizId}_${Date.now()}`,
          type: "LIVE_QUIZ",
          title: "⚡ Live Quiz Started!",
          message: "The arena is live! Tap to join and answer questions now.",
          url: `/events/${data.eventId}/quiz/${data.quizId}`,
        });
      });
    } catch {
      // Socket connection fallback
    }

    return () => {
      if (notifSocket) notifSocket.disconnect();
      if (quizSocket) quizSocket.disconnect();
    };
  }, [profile?.id, triggerIslandNotification]);

  // Determine Icon for Notification Type
  const renderTypeIcon = (type?: string) => {
    switch (type) {
      case "ANNOUNCEMENT":
        return <Megaphone className="w-3.5 h-3.5 text-cyan-400" />;
      case "LIVE_QUIZ":
        return <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
      case "TEAM_INVITE":
        return <Users className="w-3.5 h-3.5 text-indigo-400" />;
      case "STAFF_INVITE":
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case "REGISTRATION":
        return <Ticket className="w-3.5 h-3.5 text-rose-400" />;
      case "DRAFT_SAVED":
        return <BookmarkCheck className="w-3.5 h-3.5 text-[var(--accent)]" />;
      case "TOAST_SUCCESS":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "TOAST_ERROR":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "TOAST_INFO":
        return <Info className="w-4 h-4 text-[var(--accent)]" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-[var(--accent)]" />;
    }
  };

  const toneConfig = {
    TOAST_SUCCESS: {
      pillBg: isDark ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.12)",
      pillBorder: isDark ? "rgba(52, 211, 153, 0.3)" : "rgba(16, 185, 129, 0.25)",
      auraColor: "#10b981",
      ringColor: "#10b981",
    },
    TOAST_ERROR: {
      pillBg: isDark ? "rgba(239, 68, 68, 0.16)" : "rgba(239, 68, 68, 0.12)",
      pillBorder: isDark ? "rgba(248, 113, 113, 0.3)" : "rgba(239, 68, 68, 0.25)",
      auraColor: "#ef4444",
      ringColor: "#ef4444",
    },
    DEFAULT: {
      pillBg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
      pillBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
      auraColor: "var(--accent)",
      ringColor: activeAccent?.hex || "var(--accent)",
    },
  };

  const activeTone =
    toneConfig[activeNotification?.type as "TOAST_SUCCESS" | "TOAST_ERROR"] ?? toneConfig.DEFAULT;

  return (
    <div data-notification-island="true" className={`relative flex items-center shrink-0 ${className}`}>
      {/* 
        Fixed Anchor: Standard 36x36 bell icon in the navbar layout.
        When not expanded, this is the clickable button.
      */}
      <Link
        href={href}
        title="Notifications"
        className="relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: "var(--input)",
          borderColor: "var(--border)",
          color: "var(--muted)",
        }}
      >
        <Bell className="w-4 h-4" />
        {hasNotifications && !activeNotification && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 0 2px var(--bg)" }}
          />
        )}
      </Link>

      {/* 
        ========================================================================
        APPLE GLASS DYNAMIC ISLAND NOTIFICATION POPUP
        Expands outward from the notification button with spring physics,
        then collapses back into the button after 7 seconds.
        ========================================================================
      */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            key={activeNotification.id || "dynamic-island"}
            initial={{
              opacity: 0,
              scale: 0.35,
              width: 36,
              height: 36,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              width: "min(370px, calc(100vw - 32px))",
              minHeight: 50,
              height: "auto",
              x: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.35,
              width: 36,
              minHeight: 36,
              height: 36,
              transition: {
                type: "spring",
                stiffness: 450,
                damping: 32,
                mass: 0.7,
              },
            }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 26,
              mass: 0.75,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleIslandClick}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[100] cursor-pointer select-none overflow-hidden rounded-[24px] flex items-center justify-between px-3.5 py-2 gap-2.5 shadow-2xl"
            style={{
              transformOrigin: "right center",
              background: isDark
                ? "rgba(15, 17, 23, 0.88)"
                : "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(28px) saturate(160%)",
              WebkitBackdropFilter: "blur(28px) saturate(160%)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.14)"
                : "1px solid rgba(0, 0, 0, 0.08)",
              boxShadow: isDark
                ? "0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.28)"
                : "0 20px 40px -10px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.04), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)",
            }}
          >
            {/* Glossy specular top rim reflection (Apple Glass Effect) */}
            <div
              className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none"
              style={{
                background: isDark
                  ? "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35) 40%, rgba(255, 255, 255, 0.5) 50%, rgba(255, 255, 255, 0.35) 60%, transparent)"
                  : "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8) 40%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 255, 255, 0.8) 60%, transparent)",
              }}
            />

            {/* Left: Glowing Icon Pill */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative"
              style={{
                background: activeTone.pillBg,
                border: `1px solid ${activeTone.pillBorder}`,
              }}
            >
              {renderTypeIcon(activeNotification.type)}
              {/* Subtle pulsing accent aura */}
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none"
                style={{ backgroundColor: activeTone.auraColor }}
              />
            </div>

            {/* Middle: Brief Content Text */}
            <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[12.5px] font-bold line-clamp-2 tracking-tight text-[var(--text)] leading-tight"
                  style={{ fontFamily: "var(--font-display, inherit)" }}
                >
                  {activeNotification.title}
                </span>
              </div>
              {activeNotification.message && (
                <p className="text-[11px] truncate text-[var(--muted)] leading-tight mt-0.5 font-medium">
                  {activeNotification.message}
                </p>
              )}
            </div>

            {/* Right: Circular Countdown Ring & Close Button */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Apple-style circular timer */}
              <div
                className="relative w-5 h-5 flex items-center justify-center"
                title={`${Math.ceil((progress / 100) * (activeNotification.type?.startsWith("TOAST_") ? 5 : 7))}s`}
              >
                <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke={isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"}
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke={activeTone.ringColor}
                    strokeWidth="2.5"
                    strokeDasharray={56.54}
                    strokeDashoffset={56.54 - (56.54 * progress) / 100}
                    strokeLinecap="round"
                    style={{ transition: isPaused ? "none" : "stroke-dashoffset 0.08s linear" }}
                  />
                </svg>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeIsland();
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
