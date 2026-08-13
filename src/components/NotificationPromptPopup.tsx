"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, Loader2, Sparkles, Smartphone, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { pushNotificationService } from "@/services/pushNotification.service";
import { useToast } from "@/components/providers/ToastProvider";

const MAX_POPUP_SHOWS = 3;

export default function NotificationPromptPopup() {
  const pathname = usePathname();
  const { isDark, activeAccent } = useAppearance();
  const { success: showSuccess, error: showError } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    // 1. Don't show while on auth pages (login / register) or settings
    if (pathname && (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/settings"))) {
      setIsVisible(false);
      return;
    }

    // 2. Check if user is logged in
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      return;
    }

    // 3. Don't show if user already completed or dismissed the prompt
    const promptCompleted = localStorage.getItem("notification_prompt_completed");
    if (promptCompleted === "true") return;

    // 4. Check popup show count
    const countStr = localStorage.getItem("notification_popup_count") || "0";
    const count = parseInt(countStr, 10);
    if (count >= MAX_POPUP_SHOWS) return;

    // 5. Check if browser supports push
    if (!pushNotificationService.isPushSupported()) {
      localStorage.setItem("notification_prompt_completed", "true");
      return;
    }

    // 6. Check if already subscribed
    pushNotificationService.getStatus().then((status) => {
      if (status.isSubscribed) {
        localStorage.setItem("notification_prompt_completed", "true");
        return;
      }

      // Increment count and show popup smoothly
      localStorage.setItem("notification_popup_count", String(count + 1));
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1800);

      return () => clearTimeout(timer);
    });
  }, [pathname]);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      localStorage.setItem("notification_prompt_completed", "true");
      const res = await pushNotificationService.subscribeToPush();

      if (res.success) {
        showSuccess(res.message || "System push notifications enabled!");
      } else if (res.error && !res.error.includes("dismissed")) {
        showError(res.error);
      }
    } catch (e: any) {
      console.error("Failed to enable push notifications:", e);
    } finally {
      setIsEnabling(false);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("notification_prompt_completed", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 70, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 70, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          // On Desktop: bottom-6 left-6 (avoids overlapping Profile Prompt on bottom-6 right-6)
          // On Mobile: bottom-4 left-4 right-4 (cleanly centered card)
          className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto z-[250] sm:w-[370px] max-w-[370px] mx-auto sm:mx-0"
        >
          <div className={`rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-colors duration-200 ${
            isDark
              ? "bg-zinc-900/95 border-white/10 text-white shadow-black/80"
              : "bg-white/95 border-zinc-200 text-zinc-900 shadow-xl"
          }`}>
            {/* Gradient Header Strip */}
            <div className={`h-1.5 bg-gradient-to-r ${activeAccent.gradient}`} />

            <div className="p-5 relative">
              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Info */}
              <div className="flex items-start gap-3.5 mb-2.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${activeAccent.badgeBg} ${activeAccent.text} border ${activeAccent.border}/20`}>
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">
                    <Sparkles className="w-3 h-3" /> Stay in the loop
                  </div>
                  <h3 className={`text-base font-bold leading-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Enable Notifications
                  </h3>
                </div>
              </div>

              {/* Body Text */}
              <p className={`text-xs font-medium leading-relaxed mb-3 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Get instant WhatsApp-style updates for team invites, staff requests, and event reminders on your phone &amp; PC.
              </p>

              {/* Device Support Badges */}
              <div className={`flex items-center justify-center gap-3 py-1.5 px-3 rounded-xl mb-3.5 text-[11px] font-semibold ${
                isDark ? "bg-zinc-950/80 text-zinc-400 border border-white/5" : "bg-zinc-50 text-zinc-600 border border-zinc-100"
              }`}>
                <div className="flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Desktop PC/Mac</span>
                </div>
                <span className="opacity-40">•</span>
                <div className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Phone PWA</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleEnable}
                  disabled={isEnabling}
                  className={`w-full rounded-xl py-5 font-semibold text-xs text-white shadow-md transition-all hover:scale-[1.02] gap-2 ${activeAccent.bg} hover:opacity-95 cursor-pointer`}
                >
                  {isEnabling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Enable System Notifications
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  disabled={isEnabling}
                  className={`w-full text-xs font-medium h-7 transition-colors ${
                    isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Maybe Later
                </Button>
              </div>

              {/* Helper footnote */}
              <p className={`text-[10px] text-center mt-2 font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                You can change this anytime manually in Settings
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
