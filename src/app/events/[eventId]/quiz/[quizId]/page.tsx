"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useUser } from "@/components/providers/UserProvider";
import {
  Loader2, CheckCircle2, XCircle, Trophy, Lock,
  Clock, Zap, Sparkles, Radio, Award, Crown, Flame, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSocketBaseUrl } from "@/lib/socket";
import ConfettiEffect from "@/components/gamification/ConfettiEffect";

const KAHOOT_SHAPES = [
  {
    bg: "from-rose-500 via-red-600 to-rose-700 hover:from-rose-400 hover:to-red-600 border-red-400/40 shadow-rose-900/40",
    badgeBg: "bg-red-950/70 border-red-400/40 text-red-200",
    icon: "🔺",
    label: "A"
  },
  {
    bg: "from-blue-500 via-indigo-600 to-blue-700 hover:from-blue-400 hover:to-indigo-600 border-blue-400/40 shadow-blue-900/40",
    badgeBg: "bg-blue-950/70 border-blue-400/40 text-blue-200",
    icon: "🔷",
    label: "B"
  },
  {
    bg: "from-amber-500 via-yellow-600 to-amber-700 hover:from-amber-400 hover:to-yellow-600 border-amber-400/40 shadow-amber-900/40",
    badgeBg: "bg-amber-950/70 border-amber-400/40 text-amber-200",
    icon: "🟡",
    label: "C"
  },
  {
    bg: "from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:to-teal-600 border-emerald-400/40 shadow-emerald-900/40",
    badgeBg: "bg-emerald-950/70 border-emerald-400/40 text-emerald-200",
    icon: "🟩",
    label: "D"
  }
];

export default function ParticipantQuizPage() {
  const { eventId, quizId } = useParams();
  const router = useRouter();
  const { profile, isLoading } = useUser();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<"CONNECTING" | "WAITING" | "QUESTION" | "ANSWERED" | "RESULT" | "LEADERBOARD" | "QUIZ_ENDED">("CONNECTING");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(1);
  const [endedMessage, setEndedMessage] = useState<string>("The host has concluded this live activity session.");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; points: number; correctOptionId?: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    if (!quizId || !profile?.id) return;

    const socketUrl = getSocketBaseUrl();
    const newSocket = io(`${socketUrl}/quiz`, {
      transports: ["polling", "websocket"],
      withCredentials: true
    });

    setSocket(newSocket);

    const emitJoin = () => {
      const qId = parseInt(quizId as string);
      if (!isNaN(qId) && profile?.id) {
        newSocket.emit("join_quiz", {
          quizId: qId,
          userId: profile.id,
          userName: profile.name || "Participant"
        });
      }
    };

    newSocket.on("connect", () => {
      setConnectionError(null);
      emitJoin();
    });

    newSocket.on("connect_error", (err: any) => {
      console.error("[Participant Quiz] Socket connection error:", err);
      setConnectionError(err?.message || "Unable to reach the live activity server.");
    });

    newSocket.on("room_players", (data: { count: number }) => {
      if (typeof data?.count === "number") {
        setPlayerCount(data.count);
      }
    });

    if (newSocket.connected) {
      emitJoin();
    }

    newSocket.on("quiz_state", (state: any) => {
      if (state.status === "COMPLETED") {
        setStatus("QUIZ_ENDED");
        if (state.leaderboard) setLeaderboard(state.leaderboard);
      } else if (state.status === "IN_PROGRESS" && state.question) {
        setCurrentQuestion(state.question);
        setStatus("QUESTION");
        setAnswerResult(null);
        setSelectedOptionId(null);
        setQuestionStartTime(Date.now());
      } else {
        setStatus("WAITING");
      }
    });

    newSocket.on("new_question", (data: any) => {
      if (data?.question) {
        setCurrentQuestion(data.question);
        setStatus("QUESTION");
        setAnswerResult(null);
        setSelectedOptionId(null);
        setQuestionStartTime(Date.now());
      }
    });

    newSocket.on("answer_result", (data: any) => {
      setAnswerResult(data);
      if (data.correct) {
        setStreak((prev) => prev + 1);
      } else {
        setStreak(0);
      }
      setStatus("RESULT");
    });

    newSocket.on("question_ended", (data: any) => {
      setLeaderboard(data.leaderboard || []);
      setStatus("LEADERBOARD");
    });

    newSocket.on("quiz_ended", (data: any) => {
      if (data?.leaderboard) {
        setLeaderboard(data.leaderboard || []);
      }
      if (data?.message) {
        setEndedMessage(data.message);
      }
      setStatus("QUIZ_ENDED");
    });

    return () => {
      newSocket.disconnect();
    };
  }, [quizId, profile?.id]);

  // Countdown timer effect
  useEffect(() => {
    if (status === "QUESTION" && currentQuestion?.time_limit) {
      setTimeLeft(currentQuestion.time_limit);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, currentQuestion]);

  const submitAnswer = (optionId: number) => {
    if (status !== "QUESTION") return;
    setSelectedOptionId(optionId);
    const timeTaken = (Date.now() - questionStartTime) / 1000;

    socket?.emit("submit_answer", {
      quizId: parseInt(quizId as string),
      questionId: currentQuestion.id,
      optionId,
      userId: profile?.id,
      timeTaken
    });

    setStatus("ANSWERED");
  };

  // Auth Guard Screen
  if (!isLoading && !profile) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div
          className="max-w-md w-full p-8 rounded-3xl border shadow-2xl space-y-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "var(--card2)", color: "var(--accent)" }}
          >
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Authentication Required
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              Please log in to your account to participate in this live quiz activity.
            </p>
          </div>
          <Link href={`/login?returnUrl=${encodeURIComponent(`/events/${eventId}/quiz/${quizId}`)}`}>
            <Button
              className="w-full font-extrabold py-3.5 rounded-xl shadow-md text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
            >
              Log In to Join Activity
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Connecting State
  if (status === "CONNECTING") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        {connectionError ? (
          <div
            className="max-w-md w-full p-6 rounded-2xl border shadow-xl space-y-4"
            style={{ background: "var(--card)", borderColor: "rgba(239, 68, 68, 0.4)" }}
          >
            <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">Live Connection Issue</h2>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{connectionError}</p>
            </div>
            <Button
              onClick={() => {
                setConnectionError(null);
                socket?.connect();
              }}
              className="w-full font-bold py-2.5 rounded-xl text-white"
              style={{ background: "var(--accent)" }}
            >
              Retry Connection
            </Button>
          </div>
        ) : (
          <>
            <Loader2 className="animate-spin w-10 h-10" style={{ color: "var(--accent)" }} />
            <p className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Connecting to live activity room...
            </p>
          </>
        )}
      </div>
    );
  }

  // 1. LOBBY WAITING STATE (KAHOOT STYLE)
  if (status === "WAITING") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
        style={{
          background: "radial-gradient(circle at 50% 20%, color-mix(in oklab, var(--accent) 15%, var(--bg)), var(--bg))",
          color: "var(--text)"
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full p-8 rounded-3xl border shadow-2xl space-y-6"
          style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Connected & Ready
          </div>

          <div className="space-y-3">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl text-3xl font-black text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
            >
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "👋"}
            </div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              You&apos;re in the Lobby!
            </h1>
            <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              Joined as <strong style={{ color: "var(--text)" }}>{profile?.name || "Participant"}</strong>
            </p>
          </div>

          <div className="pt-4 border-t space-y-2.5" style={{ borderColor: "var(--border)" }}>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold"
              style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--accent)" }}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{playerCount} {playerCount === 1 ? "player" : "players"} in room</span>
            </div>
            <p className="text-[11px] leading-relaxed max-w-xs mx-auto" style={{ color: "var(--muted)" }}>
              Watch the main presentation screen! The first question will pop up on your screen the moment the host begins the round.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. QUESTION & ANSWERED STATE (KAHOOT EXPERIENCE)
  if (status === "QUESTION" || status === "ANSWERED") {
    const maxTime = currentQuestion?.time_limit || 20;
    const progressPercent = Math.max(0, (timeLeft / maxTime) * 100);
    const isUrgent = timeLeft <= 5 && timeLeft > 0;

    return (
      <div
        className="min-h-screen flex flex-col justify-between relative overflow-hidden"
        style={{
          background: "radial-gradient(circle at 50% 10%, color-mix(in oklab, var(--accent) 12%, var(--bg)), var(--bg))",
          color: "var(--text)"
        }}
      >
        {/* TOP STATUS HEADER */}
        <div
          className="border-b p-4 px-6 flex items-center justify-between z-20"
          style={{
            background: "color-mix(in oklab, var(--card) 90%, transparent)",
            borderColor: "var(--border)",
            backdropFilter: "blur(20px)"
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
            >
              Live Round
            </span>
            <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg">
              +{currentQuestion?.points || 1000} PTS
            </span>
            {streak > 1 && (
              <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> {streak} Streak
              </span>
            )}
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-sm font-black transition-all ${
              isUrgent ? "bg-rose-500 text-white border-rose-600 animate-pulse" : ""
            }`}
            style={!isUrgent ? { background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" } : {}}
          >
            <Clock className={`w-4 h-4 ${isUrgent ? "animate-bounce" : ""}`} />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* TOP PROGRESS TIMER BAR */}
        <div className="w-full h-2 overflow-hidden" style={{ background: "var(--card2)" }}>
          <motion.div
            className="h-full transition-all duration-1000"
            style={{
              width: `${progressPercent}%`,
              background: isUrgent
                ? "#ef4444"
                : "linear-gradient(90deg, var(--accent), var(--accent2))"
            }}
          />
        </div>

        {/* MAIN QUESTION & CHOICES */}
        <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 flex flex-col justify-between z-10 space-y-6">
          {/* Question Text Card */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-6 sm:p-8 rounded-3xl border shadow-xl text-center space-y-2 relative"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              backdropFilter: "blur(20px)"
            }}
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-500">
              Select Your Choice Below
            </span>
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-snug tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
            >
              {currentQuestion?.text}
            </h2>
          </motion.div>

          {/* Answered Waiting State or 4-Choice Kahoot Grid */}
          {status === "ANSWERED" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl border text-center space-y-4 my-auto shadow-2xl"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-emerald-500 animate-pulse shadow-md"
                style={{ background: "rgba(16, 185, 129, 0.15)" }}
              >
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3
                  className="text-xl sm:text-2xl font-black tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Answer Locked In! 🔒
                </h3>
                <p className="text-xs max-w-xs mx-auto" style={{ color: "var(--muted)" }}>
                  Speed points calculated! Result and standing will reveal as soon as the timer ends.
                </p>
              </div>
              <Loader2 className="animate-spin w-5 h-5 opacity-60 mx-auto" style={{ color: "var(--accent)" }} />
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {currentQuestion?.options?.map((opt: any, idx: number) => {
                const shape = KAHOOT_SHAPES[idx % KAHOOT_SHAPES.length];
                return (
                  <motion.button
                    key={opt.id || idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => submitAnswer(opt.id)}
                    className={`relative w-full bg-gradient-to-br ${shape.bg} border-2 p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col justify-between items-start text-left text-white transition-all cursor-pointer`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className={`px-2.5 py-0.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider border ${shape.badgeBg}`}>
                        {shape.icon} Option {shape.label}
                      </span>
                      <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-lg">
                        Tap to Submit
                      </span>
                    </div>

                    <span className="font-extrabold text-lg sm:text-xl md:text-2xl tracking-tight text-white drop-shadow">
                      {opt.text}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. RESULT STAGE (INSTANT CORRECT / INCORRECT FEEDBACK)
  if (status === "RESULT") {
    const isCorrect = answerResult?.correct;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
        style={{
          background: isCorrect
            ? "radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.25), var(--bg))"
            : "radial-gradient(circle at 50% 30%, rgba(239, 68, 68, 0.25), var(--bg))",
          color: "var(--text)"
        }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative z-10 max-w-md w-full p-8 rounded-3xl border shadow-2xl space-y-5"
          style={{
            background: "var(--card)",
            borderColor: isCorrect ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
            backdropFilter: "blur(20px)"
          }}
        >
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl ${
              isCorrect
                ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-500 border border-rose-500/30"
            }`}
          >
            {isCorrect ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
          </div>

          <div className="space-y-1">
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {isCorrect ? "Correct! 🎉" : "Incorrect ❌"}
            </h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {isCorrect ? "Awesome speed and accuracy!" : "Nice attempt — bounce back on the next one!"}
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border"
            style={{ background: "var(--card2)", borderColor: "var(--border)" }}
          >
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Round Points Awarded
            </p>
            <span
              className={`text-3xl sm:text-4xl font-mono font-black ${
                isCorrect ? "text-amber-500" : "text-slate-400"
              }`}
            >
              +{answerResult?.points || 0} PTS
            </span>
          </div>

          {isCorrect && streak > 1 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-500 border border-orange-500/30">
              <Flame className="w-4 h-4" /> {streak} Answer Streak Active!
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            <Loader2 className="animate-spin w-4 h-4" style={{ color: "var(--accent)" }} /> Waiting for leaderboard standings...
          </div>
        </motion.div>
      </div>
    );
  }

  // 4. ROUND LEADERBOARD STAGE
  if (status === "LEADERBOARD") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 overflow-y-auto"
        style={{
          background: "radial-gradient(circle at 50% 20%, color-mix(in oklab, var(--accent) 15%, var(--bg)), var(--bg))",
          color: "var(--text)"
        }}
      >
        <div className="max-w-md w-full my-auto space-y-6">
          <div className="text-center space-y-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-amber-500 mx-auto shadow-lg"
              style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)" }}
            >
              <Trophy className="w-8 h-8" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Round Leaderboard
            </h1>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Current top performers this round
            </p>
          </div>

          <div className="space-y-2">
            {leaderboard.slice(0, 7).map((lb, i) => {
              const isCurrentUser = lb.user_id === profile?.id;
              const rankIcons = ["🥇", "🥈", "🥉"];

              return (
                <motion.div
                  key={lb.id || i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex justify-between items-center p-3.5 rounded-2xl border transition-all"
                  style={{
                    background: isCurrentUser
                      ? "linear-gradient(90deg, color-mix(in oklab, var(--accent) 25%, var(--card)), var(--card))"
                      : "var(--card)",
                    borderColor: isCurrentUser ? "var(--accent)" : "var(--border)"
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 text-center font-bold">
                      {rankIcons[i] || `#${i + 1}`}
                    </span>
                    <span className="text-sm font-extrabold truncate max-w-[170px]" style={{ color: "var(--text)" }}>
                      {lb.user?.name || "Participant"} {isCurrentUser ? " (You)" : ""}
                    </span>
                  </div>
                  <span
                    className="font-mono font-black text-xs px-2.5 py-1 rounded-xl"
                    style={{ background: "var(--input)", color: "var(--accent)" }}
                  >
                    {lb.score} PTS
                  </span>
                </motion.div>
              );
            })}
          </div>

          <div className="pt-2 text-center text-xs font-semibold flex items-center justify-center gap-2" style={{ color: "var(--muted)" }}>
            <Loader2 className="animate-spin w-4 h-4" style={{ color: "var(--accent)" }} />
            Host will broadcast the next question shortly...
          </div>
        </div>
      </div>
    );
  }

  // 5. QUIZ ENDED STAGE (FINAL PODIUM & WINNERS CELEBRATION)
  if (status === "QUIZ_ENDED") {
    const userStandingIndex = leaderboard.findIndex((lb) => lb.user_id === profile?.id);
    const userScore = userStandingIndex >= 0 ? leaderboard[userStandingIndex].score : 0;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 overflow-y-auto relative"
        style={{
          background: "radial-gradient(circle at 50% 20%, color-mix(in oklab, var(--accent) 15%, var(--bg)), var(--bg))",
          color: "var(--text)"
        }}
      >
        <ConfettiEffect count={60} />

        <div className="max-w-md w-full my-auto space-y-6 z-10">
          <div className="text-center space-y-2">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-amber-500 mx-auto shadow-2xl"
              style={{ background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)" }}
            >
              <Crown className="w-9 h-9" />
            </div>
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Activity Concluded!
            </h1>
            <p className="text-xs max-w-xs mx-auto" style={{ color: "var(--muted)" }}>
              {endedMessage}
            </p>
          </div>

          {/* User's final result card */}
          {userStandingIndex >= 0 && (
            <div
              className="p-5 rounded-3xl border shadow-xl text-center space-y-2"
              style={{
                background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 20%, var(--card)), var(--card))",
                borderColor: "var(--accent)"
              }}
            >
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                Your Final Standing
              </p>
              <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                Rank #{userStandingIndex + 1} &bull; {userScore} PTS
              </h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {userStandingIndex === 0
                  ? "🏆 Gold Champion! You took 1st place!"
                  : userStandingIndex < 3
                    ? "🥈 Outstanding performance on the podium!"
                    : "Great job competing in today's live activity!"}
              </p>
            </div>
          )}

          {/* Final Standings List */}
          {leaderboard.length > 0 && (
            <div
              className="p-4 rounded-3xl border shadow-md space-y-2"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-center" style={{ color: "var(--muted)" }}>
                Final Winners Podium
              </h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
                {leaderboard.map((lb: any, i: number) => {
                  const isCurrentUser = lb.user_id === profile?.id;
                  const rankIcons = ["🥇", "🥈", "🥉"];

                  return (
                    <div
                      key={lb.id || i}
                      className="flex justify-between items-center p-2.5 rounded-xl border text-xs"
                      style={{
                        background: isCurrentUser
                          ? "linear-gradient(90deg, color-mix(in oklab, var(--accent) 20%, var(--card2)), var(--card2))"
                          : "var(--card2)",
                        borderColor: isCurrentUser ? "var(--accent)" : "var(--border)"
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center font-bold">{rankIcons[i] || `#${i + 1}`}</span>
                        <span className="font-bold truncate max-w-[150px]" style={{ color: "var(--text)" }}>
                          {lb.user?.name || "Participant"} {isCurrentUser ? " (You)" : ""}
                        </span>
                      </div>
                      <span className="font-mono font-black" style={{ color: "var(--accent)" }}>
                        {lb.score} PTS
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Link href={`/events/${eventId}`} className="block">
            <button
              className="w-full h-11 rounded-xl font-bold text-sm text-white shadow-xl transition hover:opacity-90 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
            >
              Return to Event Page <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
