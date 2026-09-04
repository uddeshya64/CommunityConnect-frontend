"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, X, Sparkles, Radio } from "lucide-react";
import { getSocketBaseUrl } from "@/lib/socket";
import { api } from "@/lib/axios";

export default function LiveQuizPopup({ userId }: { userId?: number }) {
  const pathname = usePathname();
  const router = useRouter();

  const [activeQuiz, setActiveQuiz] = useState<{ 
    quizId: number; 
    eventId: number; 
    title?: string;
    eventTitle?: string;
  } | null>(null);

  useEffect(() => {
    // 1. Do NOT run or display on auth pages or unauthenticated states
    if (
      !pathname ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/oauth") ||
      !userId
    ) {
      return;
    }

    // 2. Fetch active quiz for events the current user is registered for
    const checkActiveQuiz = async () => {
      try {
        const res = await api.get("/quizzes/active");
        if (res.data?.activeQuiz) {
          console.log("[LiveQuizBanner] Active quiz found for user:", res.data.activeQuiz);
          setActiveQuiz({
            quizId: Number(res.data.activeQuiz.quizId),
            eventId: Number(res.data.activeQuiz.eventId),
            title: res.data.activeQuiz.title,
            eventTitle: res.data.activeQuiz.eventTitle
          });
        } else {
          setActiveQuiz(null);
        }
      } catch (err) {
        console.error("[LiveQuizBanner] Error checking active quiz:", err);
      }
    };

    checkActiveQuiz();

    // 3. Connect to real-time socket
    const socketUrl = getSocketBaseUrl();
    const socket: Socket = io(`${socketUrl}/quiz`, {
      transports: ["polling", "websocket"],
      withCredentials: true
    });

    socket.on("quiz_started", (data: { sessionId: number; quizId: number; eventId: number }) => {
      console.log("[LiveQuizBanner] Received quiz_started event:", data);
      // Re-verify event registration via active API check
      checkActiveQuiz();
    });

    return () => {
      socket.disconnect();
    };
  }, [pathname, userId]);

  // Don't render on auth routes or if no active quiz for user's event
  if (
    !pathname ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/oauth") ||
    !userId ||
    !activeQuiz
  ) {
    return null;
  }

  const handleJoin = () => {
    if (activeQuiz) {
      router.push(`/events/${activeQuiz.eventId}/quiz/${activeQuiz.quizId}`);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-gradient-to-r from-indigo-950 via-purple-950 to-zinc-950 border-b border-indigo-500/30 text-white py-3.5 px-4 md:px-8 shadow-xl relative z-40"
      >
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 shrink-0">
              <Radio className="text-rose-500 w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold uppercase tracking-wider border border-rose-500/30">
                  <Sparkles className="w-3 h-3 text-yellow-400" /> LIVE ACTIVITY IN PROGRESS
                </span>
                {activeQuiz.eventTitle && (
                  <span className="text-xs text-indigo-300 font-bold hidden md:inline">
                    &bull; {activeQuiz.eventTitle}
                  </span>
                )}
              </div>
              <h4 className="text-white font-extrabold text-sm md:text-base leading-tight mt-0.5">
                {activeQuiz.title || "Interactive Session Quiz"}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={() => setActiveQuiz(null)}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1"
            >
              Dismiss
            </button>
            <button
              onClick={handleJoin}
              className="bg-white text-indigo-950 hover:bg-indigo-50 font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-2 text-xs md:text-sm group shrink-0"
            >
              <PlayCircle className="w-4 h-4 text-indigo-600 fill-current" />
              Join Live Quiz Now
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
