"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useUser } from "@/components/providers/UserProvider";
import { 
  Loader2, CheckCircle2, XCircle, Trophy, Lock, 
  Clock, Zap, Sparkles, Radio, Award 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { getSocketBaseUrl } from "@/lib/socket";

const SHAPES = [
  { 
    bg: "from-rose-500 via-red-600 to-rose-700 hover:from-rose-400 hover:to-red-600 border-red-400/30", 
    badgeBg: "bg-red-950/60 border-red-400/40 text-red-200", 
    icon: "🔺", 
    label: "Option A" 
  },
  { 
    bg: "from-blue-500 via-indigo-600 to-blue-700 hover:from-blue-400 hover:to-indigo-600 border-blue-400/30", 
    badgeBg: "bg-blue-950/60 border-blue-400/40 text-blue-200", 
    icon: "🔷", 
    label: "Option B" 
  },
  { 
    bg: "from-amber-500 via-yellow-600 to-amber-700 hover:from-amber-400 hover:to-yellow-600 border-amber-400/30", 
    badgeBg: "bg-amber-950/60 border-amber-400/40 text-amber-200", 
    icon: "🟡", 
    label: "Option C" 
  },
  { 
    bg: "from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:to-teal-600 border-emerald-400/30", 
    badgeBg: "bg-emerald-950/60 border-emerald-400/40 text-emerald-200", 
    icon: "🟩", 
    label: "Option D" 
  }
];

export default function ParticipantQuizPage() {
  const { eventId, quizId } = useParams();
  const { profile, isLoading } = useUser();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<"CONNECTING" | "WAITING" | "QUESTION" | "ANSWERED" | "RESULT" | "LEADERBOARD" | "QUIZ_ENDED">("CONNECTING");
  const [endedMessage, setEndedMessage] = useState<string>("The host has concluded the live quiz activity.");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean, points: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);

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
        newSocket.emit("join_quiz", { quizId: qId, userId: profile.id });
      }
    };

    if (newSocket.connected) {
      emitJoin();
    } else {
      newSocket.on("connect", emitJoin);
    }

    newSocket.on("quiz_state", (state: any) => {
      if (state.status === "COMPLETED") {
        setStatus("QUIZ_ENDED");
        if (state.leaderboard) setLeaderboard(state.leaderboard);
      } else if (state.status === "IN_PROGRESS" && state.question) {
        setCurrentQuestion(state.question);
        setStatus("QUESTION");
        setAnswerResult(null);
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
        setQuestionStartTime(Date.now());
      }
    });

    newSocket.on("answer_result", (data: any) => {
      setAnswerResult(data);
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
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 text-center p-6 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white mb-2">Authentication Required</h1>
            <p className="text-zinc-400 text-sm">
              Please log in to your account to participate in this live activity.
            </p>
          </div>
          <Link href={`/login?returnUrl=${encodeURIComponent(`/events/${eventId}/quiz/${quizId}`)}`}>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30">
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
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 text-indigo-400 space-y-4">
        <Loader2 className="animate-spin w-12 h-12" />
        <p className="text-sm font-semibold text-zinc-400">Connecting to live activity room...</p>
      </div>
    );
  }

  // Lobby Waiting State
  if (status === "WAITING") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-indigo-950 to-purple-950 text-white p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            Connected & Ready
          </div>

          <div className="space-y-2">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-lg text-3xl">
              👋
            </div>
            <h1 className="text-3xl font-black tracking-tight">You&apos;re in the Lobby!</h1>
            <p className="text-indigo-200 text-sm font-semibold">
              Joined as <span className="text-white font-extrabold">{profile?.name || "Participant"}</span>
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Waiting for Host Broadcast
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              The host has launched the activity. Questions will appear on your screen automatically as soon as the host selects them!
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Question & Answered State
  if (status === "QUESTION" || status === "ANSWERED") {
    const maxTime = currentQuestion?.time_limit || 20;
    const progressPercent = (timeLeft / maxTime) * 100;

    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-zinc-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden">
        {/* TOP STATUS HEADER */}
        <div className="bg-zinc-900/80 backdrop-blur-md border-b border-white/10 p-4 sm:p-5 px-6 flex items-center justify-between z-20 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  Live Question
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-300 mt-0.5">
                Points: <span className="text-amber-400 font-black">+{currentQuestion?.points || 1000} PTS</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
            <Clock className={`w-5 h-5 ${timeLeft <= 5 ? "text-rose-400 animate-bounce" : "text-indigo-400"}`} />
            <span className={`font-mono text-xl font-black ${timeLeft <= 5 ? "text-rose-400" : "text-white"}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* TIMER PROGRESS BAR */}
        <div className="w-full bg-zinc-800/50 h-1.5 overflow-hidden">
          <motion.div 
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 5 ? "bg-rose-500" : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* MAIN QUESTION & OPTIONS CONTENT */}
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 md:p-8 flex flex-col justify-between z-10 overflow-y-auto space-y-6">
          
          {/* HERO QUESTION CARD */}
          <motion.div 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl text-center space-y-3 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Live Quiz Broadcast
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
              {currentQuestion?.text}
            </h2>
          </motion.div>

          {/* ANSWERED OVERLAY OR OPTIONS GRID */}
          {status === "ANSWERED" ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center space-y-4 my-auto shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 animate-pulse shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white">Answer Submitted!</h3>
              <p className="text-indigo-200 text-sm max-w-xs font-medium">
                Hold tight — results and points will reveal as soon as the timer ends or the host moves forward!
              </p>
              <Loader2 className="animate-spin w-6 h-6 text-indigo-400 opacity-60 mx-auto mt-2" />
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {currentQuestion?.options?.map((opt: any, idx: number) => {
                const shape = SHAPES[idx % SHAPES.length];
                return (
                  <motion.button
                    key={opt.id || idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => submitAnswer(opt.id)}
                    className={`relative w-full bg-gradient-to-br ${shape.bg} border p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between items-start text-left text-white transition-all group overflow-hidden`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider border backdrop-blur-md ${shape.badgeBg}`}>
                        {shape.icon} {shape.label}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg">
                        Tap to Select →
                      </span>
                    </div>

                    <span className="font-extrabold text-xl sm:text-2xl md:text-3xl text-white tracking-snug drop-shadow">
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

  // Result Stage (Correct / Incorrect)
  if (status === "RESULT") {
    const isCorrect = answerResult?.correct;
    return (
      <div className={`h-screen flex flex-col items-center justify-center text-white p-6 relative overflow-hidden ${
        isCorrect 
          ? "bg-gradient-to-br from-emerald-950 via-teal-950 to-zinc-950" 
          : "bg-gradient-to-br from-rose-950 via-red-950 to-zinc-950"
      }`}>
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isCorrect ? "bg-emerald-500/20" : "bg-rose-500/20"
        }`} />

        <motion.div 
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative z-10 max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl text-center space-y-6"
        >
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl border ${
            isCorrect 
              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400" 
              : "bg-rose-500/20 border-rose-400/40 text-rose-400"
          }`}>
            {isCorrect ? <CheckCircle2 className="w-14 h-14" /> : <XCircle className="w-14 h-14" />}
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              {isCorrect ? "Correct! 🎉" : "Incorrect ❌"}
            </h1>
            <p className="text-zinc-300 text-sm font-medium">
              {isCorrect ? "Great speed & accuracy!" : "Nice attempt, better luck on the next one!"}
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-2xl py-4 px-6 border border-white/10 inline-block w-full">
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-400 mb-1">Points Earned</p>
            <span className={`text-4xl font-black ${isCorrect ? "text-amber-400" : "text-zinc-400"}`}>
              +{answerResult?.points || 0} PTS
            </span>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400">
            <Loader2 className="animate-spin w-4 h-4 text-indigo-400" /> Waiting for next question...
          </div>
        </motion.div>
      </div>
    );
  }

  // Leaderboard Stage
  if (status === "LEADERBOARD") {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-950 text-white p-6 overflow-y-auto">
        <div className="max-w-md mx-auto w-full my-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-yellow-500/20 border border-yellow-400/30 rounded-2xl flex items-center justify-center text-yellow-400 mx-auto shadow-inner">
              <Trophy className="w-9 h-9" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Activity Leaderboard</h1>
            <p className="text-indigo-200 text-xs font-semibold">Top performers for this round</p>
          </div>
          
          <div className="space-y-3">
            {leaderboard.map((lb, i) => {
              const isCurrentUser = lb.user_id === profile?.id;
              const ranks = [
                "from-amber-500/30 border-amber-400/50 text-amber-300",
                "from-slate-400/30 border-slate-300/50 text-slate-200",
                "from-amber-700/30 border-amber-600/50 text-amber-400"
              ];
              const rankClass = ranks[i] || "bg-white/10 border-white/10 text-white";

              return (
                <motion.div 
                  key={lb.id || i}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex justify-between items-center p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${
                    isCurrentUser 
                      ? "bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border-yellow-400 text-white font-extrabold ring-2 ring-yellow-400/50" 
                      : `bg-gradient-to-r ${rankClass}`
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-lg font-black w-6 text-center opacity-80">#{i + 1}</span>
                    <span className="text-base font-bold truncate max-w-[180px]">
                      {lb.user?.name || "Participant"} {isCurrentUser ? " (You)" : ""}
                    </span>
                  </div>
                  <span className="font-mono font-black text-lg bg-black/30 px-3 py-1 rounded-xl text-amber-300 border border-white/10">
                    {lb.score} PTS
                  </span>
                </motion.div>
              );
            })}
          </div>
          
          <div className="pt-4 text-center text-xs font-semibold text-indigo-300/80 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin w-4 h-4" /> Waiting for host to broadcast next round...
          </div>
        </div>
      </div>
    );
  }

  // Quiz Ended Stage
  if (status === "QUIZ_ENDED") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-950 via-zinc-950 to-indigo-950 text-white p-6 overflow-y-auto">
        <div className="max-w-md mx-auto w-full my-auto space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-3xl border border-yellow-300/40 flex items-center justify-center text-zinc-950 mx-auto shadow-2xl shadow-yellow-500/20">
              <Trophy className="w-10 h-10" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Quiz Session Concluded</h1>
            <p className="text-indigo-200 text-sm font-semibold max-w-xs mx-auto leading-relaxed">
              {endedMessage}
            </p>
          </div>

          {leaderboard.length > 0 && (
            <div className="space-y-3 bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl">
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-amber-400 text-center mb-4 flex items-center justify-center gap-1.5">
                <Award className="w-4 h-4" /> Final Leaderboard Standings
              </h2>
              {leaderboard.map((lb: any, i: number) => {
                const isCurrentUser = lb.user_id === profile?.id;
                const ranks = [
                  "from-amber-500/30 border-amber-400/50 text-amber-300",
                  "from-slate-400/30 border-slate-300/50 text-slate-200",
                  "from-amber-700/30 border-amber-600/50 text-amber-400"
                ];
                const rankClass = ranks[i] || "bg-white/10 border-white/10 text-white";

                return (
                  <motion.div 
                    key={lb.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex justify-between items-center p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
                      isCurrentUser 
                        ? "bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border-yellow-400 text-white font-extrabold ring-2 ring-yellow-400/50" 
                        : `bg-gradient-to-r ${rankClass}`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black w-6 text-center opacity-80">#{i + 1}</span>
                      <span className="text-sm font-bold truncate max-w-[160px]">
                        {lb.user?.name || "Participant"} {isCurrentUser ? " (You)" : ""}
                      </span>
                    </div>
                    <span className="font-mono font-black text-sm bg-black/40 px-3 py-1 rounded-xl text-amber-300 border border-white/10">
                      {lb.score} PTS
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}

          <Link href={`/events/${eventId}`} className="block">
            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold py-3.5 rounded-2xl shadow-xl shadow-indigo-600/30 text-sm">
              Return to Event Page
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
