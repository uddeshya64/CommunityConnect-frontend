"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { User, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_POPUP_SHOWS = 5;

export default function ProfilePromptPopup() {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Don't show if profile is already completed
        const profileCompleted = localStorage.getItem("profile_completed");
        if (profileCompleted === "true") return;

        // Check how many times we've shown the popup
        const countStr = localStorage.getItem("profile_popup_count") || "0";
        const count = parseInt(countStr, 10);

        if (count >= MAX_POPUP_SHOWS) return;

        // Increment count and show after a short delay for better UX
        localStorage.setItem("profile_popup_count", String(count + 1));
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
    };

    const handleGoToProfile = () => {
        localStorage.setItem("profile_completed", "true");
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
                    className="fixed bottom-6 right-6 z-[200] w-[360px] max-w-[calc(100vw-3rem)]"
                >
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl shadow-indigo-900/10 overflow-hidden">
                        {/* Gradient Accent Top */}
                        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500" />

                        <div className="p-5">
                            {/* Close Button */}
                            <button
                                onClick={handleDismiss}
                                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
                                aria-label="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Content */}
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-zinc-900 leading-tight">
                                        Complete your profile
                                    </h3>
                                    <p className="text-sm text-zinc-500 font-medium mt-1 leading-snug">
                                        Add your skills, bio & social links to stand out in the
                                        community!
                                    </p>
                                </div>
                            </div>

                            {/* Action Button */}
                            <Button
                                onClick={handleGoToProfile}
                                className="w-full mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] gap-2"
                            >
                                Complete Profile <ArrowRight className="w-4 h-4" />
                            </Button>

                            {/* Remaining count hint */}
                            <p className="text-xs text-zinc-400 text-center mt-3 font-medium">
                                You can also update your profile later from the navbar
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
