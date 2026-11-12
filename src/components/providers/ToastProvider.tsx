"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface PendingIslandToast {
  id: string;
  type: "TOAST_SUCCESS" | "TOAST_ERROR" | "TOAST_INFO";
  title: string;
  created_at: string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function mapToastEventType(type: ToastType): PendingIslandToast["type"] {
  if (type === "error") return "TOAST_ERROR";
  if (type === "info") return "TOAST_INFO";
  return "TOAST_SUCCESS";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [fallbackToasts, setFallbackToasts] = useState<Toast[]>([]);
  const { isDark } = useAppearance();
  const pathname = usePathname();
  const lastRedirectToastRef = useRef<{ payload: PendingIslandToast; at: number } | null>(null);

  const removeFallbackToast = useCallback((id: string) => {
    setFallbackToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Re-dispatch recent toasts (e.g. "Event created successfully!") across immediate router redirects
  useEffect(() => {
    const recent = lastRedirectToastRef.current;
    if (!recent || Date.now() - recent.at > 2000) return;

    const replayPayload: PendingIslandToast = {
      ...recent.payload,
      id: `${recent.payload.id}_nav_${Date.now()}`,
    };
    lastRedirectToastRef.current = null;

    const t1 = window.setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("cc_trigger_notification", { detail: replayPayload }));
      } catch {
        /* ignore */
      }
    }, 140);

    const t2 = window.setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("cc_trigger_notification", { detail: replayPayload }));
      } catch {
        /* ignore */
      }
    }, 420);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const payload: PendingIslandToast = {
        id,
        type: mapToastEventType(type),
        title: message,
        created_at: new Date().toISOString(),
      };

      const hasBellIsland =
        typeof document !== "undefined" &&
        Boolean(document.querySelector('[data-notification-island="true"]'));

      if (hasBellIsland && typeof window !== "undefined") {
        lastRedirectToastRef.current = { payload, at: Date.now() };
        try {
          window.dispatchEvent(new CustomEvent("cc_trigger_notification", { detail: payload }));
        } catch {
          /* ignore */
        }
        return;
      }

      // Fallback ONLY for routes without Navbar NotificationBellIsland (e.g. /login, /register),
      // styled cleanly in the exact same top-right Apple Glass Dynamic Island style.
      setFallbackToasts([{ id, message, type }]);
      window.setTimeout(() => {
        removeFallbackToast(id);
      }, 4500);
    },
    [removeFallbackToast]
  );

  const success = useCallback((message: string) => toast(message, "success"), [toast]);
  const error = useCallback((message: string) => toast(message, "error"), [toast]);
  const info = useCallback((message: string) => toast(message, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}

      {/* Top-right Apple Glass Dynamic Island fallback when Navbar island isn't mounted */}
      {fallbackToasts.length > 0 && (
        <div className="fixed top-4 right-5 z-[9999] flex flex-col gap-2 max-w-[min(360px,calc(100vw-32px))] w-full pointer-events-none">
          <AnimatePresence>
            {fallbackToasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="pointer-events-auto rounded-[24px] px-3.5 py-2.5 flex items-center gap-2.5 shadow-2xl overflow-hidden relative"
                style={{
                  background: isDark
                    ? "rgba(15, 17, 23, 0.9)"
                    : "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(28px) saturate(160%)",
                  WebkitBackdropFilter: "blur(28px) saturate(160%)",
                  border: isDark
                    ? "1px solid rgba(255, 255, 255, 0.14)"
                    : "1px solid rgba(0, 0, 0, 0.08)",
                  boxShadow: isDark
                    ? "0 20px 40px -10px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)"
                    : "0 20px 40px -10px rgba(15, 23, 42, 0.16), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    background:
                      t.type === "success"
                        ? "rgba(16, 185, 129, 0.14)"
                        : t.type === "error"
                        ? "rgba(239, 68, 68, 0.14)"
                        : "color-mix(in srgb, var(--accent) 14%, transparent)",
                    borderColor:
                      t.type === "success"
                        ? "rgba(16, 185, 129, 0.35)"
                        : t.type === "error"
                        ? "rgba(239, 68, 68, 0.35)"
                        : "color-mix(in srgb, var(--accent) 32%, transparent)",
                  }}
                >
                  {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {t.type === "error" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  {t.type === "info" && <Info className="w-4 h-4 text-[var(--accent)]" />}
                </div>

                <p
                  className="text-[12.5px] font-bold flex-1 leading-snug line-clamp-2"
                  style={{ color: "var(--text)" }}
                >
                  {t.message}
                </p>

                <button
                  type="button"
                  onClick={() => removeFallbackToast(t.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
