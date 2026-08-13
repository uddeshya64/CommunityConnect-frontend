"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/providers/AppearanceProvider";

const MAX_POPUP_SHOWS = 5;

export default function ProfilePromptPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, activeAccent } = useAppearance();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show on auth pages or profile edit page
    if (pathname && (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/profile/edit"))) {
      setIsVisible(false);
      return;
    }

    // Don't show if user is not logged in
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;

    // Don't show if profile is already completed
    const profileCompleted = localStorage.getItem("profile_completed");
    if (profileCompleted === "true") return;

    // Check how many times we've shown the popup
    const countStr = localStorage.getItem("profile_popup_count") || "0";
    const count = parseInt(countStr, 10);

    if (count >= MAX_POPUP_SHOWS) return;

    // Increment count and show after a short delay for better UX
    localStorage.setItem("profile_popup_count", String(count + 1));
    const timer = setTimeout(() => setIsVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleGoToProfile = () => {
    localStorage.setItem("profile_completed", "true");
    setIsVisible(false);
    router.push("/profile/edit");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px]"
        >
          <div className={`rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-colors duration-200 ${
            isDark
              ? "bg-zinc-900/95 border-white/10 text-white shadow-black/70"
              : "bg-white/95 border-zinc-200 text-zinc-900 shadow-xl"
          }`}>
            {/* Gradient Accent Top */}
            <div className={`h-1.5 bg-gradient-to-r ${activeAccent.gradient}`} />

            <div className="p-5">
              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div className="flex items-start gap-3.5">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${activeAccent.badgeBg} ${activeAccent.text} border ${activeAccent.border}/20`}>
                  <Sparkles className="w-5 h-5 text-current" />
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <h3 className={`text-base font-bold leading-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Complete your profile
                  </h3>
                  <p className={`text-xs font-medium mt-1 leading-snug ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Add your skills, bio &amp; social links to stand out in the community!
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleGoToProfile}
                className={`w-full mt-4 rounded-xl py-5 font-semibold text-white shadow-md transition-all hover:scale-[1.02] gap-2 ${activeAccent.bg} hover:opacity-95 cursor-pointer`}
              >
                Complete Profile <ArrowRight className="w-4 h-4" />
              </Button>

              {/* Remaining count hint */}
              <p className={`text-[11px] text-center mt-2.5 font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                You can also update your profile later from the navbar
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
