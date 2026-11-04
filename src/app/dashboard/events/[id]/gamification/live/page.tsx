"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Users, Play, Trophy, HelpCircle, Clock, Sparkles,
  Copy, Check, Share2, Radio, UserCheck, ArrowRight,
  Maximize2, Minimize2, Award, Crown, Flame, AlertCircle,
  CheckCircle2, X
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/axios";
import { getSocketBaseUrl } from "@/lib/socket";
import { hasStoredSession } from "@/lib/auth";
import ConfettiEffect from "@/components/gamification/ConfettiEffect";

const KAHOOT_SHAPES = [
  {
    bg: "from-rose-500/20 to-red-600/30 border-red-500/40 text-red-100",
    badge: "bg-red-500 text-white",
    icon: "🔺",
    label: "A"
  },
  {
    bg: "from-blue-500/20 to-indigo-600/30 border-blue-500/40 text-blue-100",
    badge: "bg-blue-500 text-white",
    icon: "🔷",
    label: "B"
  },
  {
    bg: "from-amber-500/20 to-yellow-600/30 border-amber-500/40 text-amber-100",
    badge: "bg-amber-500 text-white",
    icon: "🟡",
    label: "C"
  },
  {
    bg: "from-emerald-500/20 to-teal-600/30 border-emerald-500/40 text-emerald-100",
    badge: "bg-emerald-500 text-white",
    icon: "🟩",
    label: "D"
  }
];

export default function LiveOrganizerDashboard() {
  const router = useRouter();
  const { id: eventId } = useParams();
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quizId");

  useEffect(() => {
    if (!hasStoredSession()) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [router]);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [usersJoined, setUsersJoined] = useState<number>(0);
  const [connectedPlayers, setConnectedPlayers] = useState<Array<{ userId: number; name: string }>>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Game state
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [showLeaderboardStage, setShowLeaderboardStage] = useState(false);
  const [correctOptionId, setCorrectOptionId] = useState<number | null>(null);

  // Countdown timer on host screen
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!eventId || !quizId || !hasStoredSession()) return;

    // Fetch quiz data with questions & options
    api.get(`/events/${eventId}/quizzes`)
      .then((res) => {
        const quizzes = res.data.quizzes || res.data || [];
        const found = quizzes.find((q: any) => q.id === parseInt(quizId as string));
        if (found) {
          setQuiz(found);
          if (found.status === "COMPLETED") {
            setQuizEnded(true);
          }
        }
      })
      .catch((err) => console.error("Error fetching live quiz details:", err));
  }, [eventId, quizId]);

  useEffect(() => {
    if (!quizId) return;

    const socketUrl = getSocketBaseUrl();
    const newSocket = io(`${socketUrl}/quiz`, {
      transports: ["polling", "websocket"],
      withCredentials: true
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log(`[Host Arena] Socket connected: ${newSocket.id}`);
      // Join as host (userId 0)
      newSocket.emit("join_quiz", {
        quizId: parseInt(quizId as string),
        userId: 0,
        userName: "Host (Organizer)"
      });
    });

    newSocket.on("room_players", (data: { count: number; players: Array<{ userId: number; name: string }> }) => {
      setUsersJoined(data.count || 0);
      setConnectedPlayers(data.players || []);
    });

    newSocket.on("user_joined", (data: any) => {
      if (typeof data?.count === "number") {
        setUsersJoined(data.count);
      }
    });

    newSocket.on("quiz_state", (state: any) => {
      if (state.status === "COMPLETED") {
        setQuizEnded(true);
        if (state.leaderboard) setLeaderboard(state.leaderboard);
      } else if (state.status === "IN_PROGRESS" && state.question) {
        setQuizStarted(true);
        setCurrentQuestion(state.question);
        setCorrectOptionId(null);
        startTimer(state.question.time_limit || 20);
      } else {
        setQuizStarted(false);
      }
    });

    newSocket.on("quiz_started", () => {
      setQuizStarted(true);
    });

    newSocket.on("new_question", (data: any) => {
      setCurrentQuestion(data.question);
      setCorrectOptionId(null);
      setLeaderboard([]);
      setShowLeaderboardStage(false);
      startTimer(data.question?.time_limit || 20);
    });

    newSocket.on("question_ended", (data: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0);
      if (data.correctOptionId) {
        setCorrectOptionId(data.correctOptionId);
      }
      setLeaderboard(data.leaderboard || []);
      setShowLeaderboardStage(true);
    });

    newSocket.on("quiz_ended", (data: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setQuizEnded(true);
      setLeaderboard(data.leaderboard || []);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      newSocket.disconnect();
    };
  }, [quizId]);

  const startTimer = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartQuiz = () => {
    if (!quiz?.questions || quiz.questions.length === 0) return;
    socket?.emit("start_quiz", { quizId: parseInt(quizId as string) });
    setQuizStarted(true);
    // Broadcast question 1
    const firstQ = quiz.questions[0];
    if (firstQ) {
      handleNextQuestion(firstQ.id);
    }
  };

  const handleNextQuestion = (questionId: number) => {
    setShowLeaderboardStage(false);
    setCorrectOptionId(null);
    socket?.emit("next_question", { quizId: parseInt(quizId as string), questionId });
  };

  const handleShowLeaderboard = (questionId: number) => {
    setShowLeaderboardStage(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    socket?.emit("end_question", { quizId: parseInt(quizId as string), questionId });
  };

  const handleEndQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    socket?.emit("end_quiz", { quizId: parseInt(quizId as string) });
    setQuizEnded(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  const getParticipantUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/events/${eventId}/quiz/${quizId}`;
    }
    return `/events/${eventId}/quiz/${quizId}`;
  };

  const copyParticipantLink = () => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(getParticipantUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Safe question calculation (ZERO LEAKS: does not expose future questions)
  const currentIdx = quiz?.questions?.findIndex((q: any) => q.id === currentQuestion?.id) ?? -1;
  const totalQuestions = quiz?.questions?.length || 0;
  const hasNextQuestion = currentIdx >= 0 && currentIdx < totalQuestions - 1;
  const nextQuestionObj = hasNextQuestion ? quiz.questions[currentIdx + 1] : null;

  return (
    <div
      className="min-h-screen flex flex-col justify-between transition-colors duration-300"
      style={{
        background: "radial-gradient(circle at 50% 10%, color-mix(in oklab, var(--accent) 12%, var(--bg)), var(--bg))",
        color: "var(--text)"
      }}
    >
      {/* 1. TOP BROADCAST HEADER (ALWAYS VISIBLE & PROJECTOR-READY) */}
      <header
        className="w-full px-5 py-4 border-b flex items-center justify-between z-30"
        style={{
          background: "color-mix(in oklab, var(--card) 85%, transparent)",
          borderColor: "var(--border)",
          backdropFilter: "blur(20px)"
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff" }}
          >
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-500">
                Live Broadcast Arena
              </span>
              <span className="text-xs opacity-40">&bull;</span>
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                {quiz ? quiz.title : `Quiz #${quizId}`}
              </span>
            </div>
            <h1
              className="text-base sm:text-lg font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {quizEnded
                ? "Concluded · Final Winners Podium"
                : !quizStarted
                  ? "Participant Waiting Lobby"
                  : showLeaderboardStage
                    ? `Leaderboard · Question ${currentIdx + 1} of ${totalQuestions}`
                    : `Active Turn · Question ${currentIdx + 1} of ${totalQuestions}`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time players count badge */}
          <div
            className="px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold"
            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <Users className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-mono font-extrabold">{usersJoined}</span>
            <span className="hidden sm:inline" style={{ color: "var(--muted)" }}>
              {usersJoined === 1 ? "player" : "players"} in lobby
            </span>
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border text-xs font-medium hover:opacity-85 transition cursor-pointer"
            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
            title="Toggle Projector Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* End quiz safety button */}
          {!quizEnded && (
            <button
              onClick={handleEndQuiz}
              className="h-9 px-3.5 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer flex items-center gap-1.5"
            >
              🏁 End Quiz
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN STAGE CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full z-10">
        {quizEnded ? (
          /* =========================================================================
             STAGE 4: FINAL WINNERS PODIUM (KAHOOT-STYLE PODIUM & CELEBRATION)
             ========================================================================= */
          <div className="w-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500 relative">
            <ConfettiEffect count={70} />

            <div className="text-center space-y-2">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl"
                style={{ background: "linear-gradient(135deg, #f59e0b, #eab308)", color: "#fff" }}
              >
                <Crown className="w-9 h-9" />
              </div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Quiz Concluded!
              </h2>
              <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                Here are the top champions from this live session!
              </p>
            </div>

            {/* 3D-Style Podium (1st, 2nd, 3rd) */}
            {leaderboard.length > 0 && (
              <div className="w-full max-w-3xl flex items-end justify-center gap-3 sm:gap-6 pt-6 pb-2">
                {/* 2nd Place (Silver) */}
                {leaderboard[1] && (
                  <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500 delay-150">
                    <div className="text-center mb-2">
                      <span className="text-2xl sm:text-3xl">🥈</span>
                      <p className="font-extrabold text-xs sm:text-sm line-clamp-1 mt-1">
                        {leaderboard[1].user?.name || "Player 2"}
                      </p>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {leaderboard[1].score} pts
                      </span>
                    </div>
                    <div
                      className="w-full h-32 sm:h-40 rounded-t-2xl border-t-2 border-x-2 flex items-center justify-center font-black text-xl sm:text-2xl shadow-xl"
                      style={{
                        background: "linear-gradient(to top, rgba(148, 163, 184, 0.1), rgba(148, 163, 184, 0.3))",
                        borderColor: "rgba(148, 163, 184, 0.6)",
                        color: "#94a3b8"
                      }}
                    >
                      2nd
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold Champion) */}
                {leaderboard[0] && (
                  <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-12 duration-700">
                    <div className="text-center mb-2">
                      <div className="inline-block relative">
                        <Crown className="w-6 h-6 text-amber-400 mx-auto animate-bounce" />
                        <span className="text-3xl sm:text-4xl">🥇</span>
                      </div>
                      <p className="font-black text-sm sm:text-base line-clamp-1 mt-1 text-amber-400">
                        {leaderboard[0].user?.name || "Champion"}
                      </p>
                      <span className="text-xs font-mono font-black text-amber-500">
                        {leaderboard[0].score} pts
                      </span>
                    </div>
                    <div
                      className="w-full h-44 sm:h-56 rounded-t-2xl border-t-2 border-x-2 flex flex-col items-center justify-center font-black text-2xl sm:text-3xl shadow-2xl relative overflow-hidden"
                      style={{
                        background: "linear-gradient(to top, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.45))",
                        borderColor: "rgba(245, 158, 11, 0.8)",
                        color: "#f59e0b"
                      }}
                    >
                      <Sparkles className="w-6 h-6 text-amber-300 absolute top-2 right-2 animate-pulse" />
                      1st
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {leaderboard[2] && (
                  <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-6 duration-500 delay-300">
                    <div className="text-center mb-2">
                      <span className="text-2xl sm:text-3xl">🥉</span>
                      <p className="font-extrabold text-xs sm:text-sm line-clamp-1 mt-1">
                        {leaderboard[2].user?.name || "Player 3"}
                      </p>
                      <span className="text-[11px] font-mono font-bold text-amber-600">
                        {leaderboard[2].score} pts
                      </span>
                    </div>
                    <div
                      className="w-full h-24 sm:h-32 rounded-t-2xl border-t-2 border-x-2 flex items-center justify-center font-black text-lg sm:text-xl shadow-lg"
                      style={{
                        background: "linear-gradient(to top, rgba(217, 119, 6, 0.1), rgba(217, 119, 6, 0.25))",
                        borderColor: "rgba(217, 119, 6, 0.5)",
                        color: "#d97706"
                      }}
                    >
                      3rd
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full standings list */}
            {leaderboard.length > 3 && (
              <div
                className="w-full max-w-xl rounded-2xl border p-4 space-y-2 shadow-sm"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                  Honorable Standings
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {leaderboard.slice(3).map((lb, i) => (
                    <div
                      key={lb.id || i}
                      className="flex items-center justify-between p-2.5 rounded-xl border text-xs"
                      style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold w-6 text-center" style={{ color: "var(--muted)" }}>
                          #{i + 4}
                        </span>
                        <span className="font-semibold" style={{ color: "var(--text)" }}>
                          {lb.user?.name || "Participant"}
                        </span>
                      </div>
                      <span className="font-mono font-extrabold" style={{ color: "var(--accent)" }}>
                        {lb.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Console Button */}
            <Link href={`/events/${eventId}`}>
              <button
                className="h-11 px-8 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                Return to Organizer Dashboard →
              </button>
            </Link>
          </div>
        ) : !quizStarted ? (
          /* =========================================================================
             STAGE 1: PROJECTOR WAITING ROOM / LOBBY (LIVE PLAYERS COUNTER & QR)
             ========================================================================= */
          <div className="w-full max-w-5xl space-y-6 animate-in fade-in duration-300">
            {/* Top Presentation Banner */}
            <div
              className="p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-6"
              style={{
                background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, var(--card)), var(--card))",
                borderColor: "color-mix(in oklab, var(--accent) 30%, var(--border))"
              }}
            >
              <div className="space-y-1.5 text-center md:text-left">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Lobby Open &bull; Accepting Players
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-black tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Join the Live Activity Arena!
                </h2>
                <p className="text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
                  Scan the QR code from your phone or use the direct join link below to participate.
                </p>
              </div>

              {/* Direct Join Link with Copy */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  readOnly
                  value={getParticipantUrl()}
                  className="px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium outline-none select-all w-full md:w-72"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                <button
                  onClick={copyParticipantLink}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs border shadow-xs transition hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                  style={{ background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" }}
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? "Copied" : "Copy Link"}
                </button>
              </div>
            </div>

            {/* 2-Column Grid: Big QR Code + Live Attendees Wall */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Projected QR Card */}
              <div
                className="p-6 rounded-3xl border shadow-md flex flex-col items-center justify-center text-center space-y-4"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <div className="p-4 bg-white rounded-2xl shadow-lg border-2 border-indigo-500/20">
                  <QRCodeSVG
                    value={getParticipantUrl()}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-500">
                    Point Phone Camera to Join
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                    Works instantly in any mobile browser &bull; No app install needed
                  </p>
                </div>
              </div>

              {/* Right Column (2 cols): Real-time Connected Players Wall */}
              <div
                className="md:col-span-2 p-6 rounded-3xl border shadow-md flex flex-col justify-between space-y-4"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    <h3 className="font-extrabold text-base tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                      Players in Room
                    </h3>
                  </div>
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-mono font-extrabold border"
                    style={{
                      background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                      borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
                      color: "var(--accent)"
                    }}
                  >
                    ⚡ {usersJoined} {usersJoined === 1 ? "player" : "players"} connected
                  </span>
                </div>

                {/* Players Wall Chips */}
                <div className="flex-1 flex flex-col justify-center items-center min-h-[180px] max-h-60 overflow-y-auto no-scrollbar py-2">
                  {connectedPlayers.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                      {connectedPlayers.map((p, idx) => (
                        <div
                          key={p.userId || idx}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xs animate-in zoom-in-95 duration-200"
                          style={{
                            background: "var(--card2)",
                            borderColor: "var(--border)",
                            color: "var(--text)"
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[140px]">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto animate-pulse"
                        style={{ background: "var(--card2)", color: "var(--accent)" }}
                      >
                        <Radio className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold" style={{ color: "var(--text)" }}>
                        Waiting for players to join...
                      </p>
                      <p className="text-[11px] max-w-xs mx-auto" style={{ color: "var(--muted)" }}>
                        Share the link or display this screen. Attendees will pop up here in real time as they enter the lobby.
                      </p>
                    </div>
                  )}
                </div>

                {/* Ready Questions Footer & Launch CTA */}
                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    <strong style={{ color: "var(--text)" }}>{totalQuestions} questions</strong> loaded & ready
                  </span>

                  <button
                    onClick={handleStartQuiz}
                    disabled={totalQuestions === 0}
                    className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Launch Quiz Now (Question 1)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : showLeaderboardStage ? (
          /* =========================================================================
             STAGE 3: ROUND LEADERBOARD (BETWEEN QUESTIONS)
             ========================================================================= */
          <div className="w-full max-w-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider"
                style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  borderColor: "rgba(245, 158, 11, 0.3)",
                  color: "#f59e0b"
                }}
              >
                <Trophy className="w-4 h-4" /> Round Leaderboard
              </div>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Standings after Question {currentIdx + 1}
              </h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Top participants leading this live gamification round
              </p>
            </div>

            {/* Standings List */}
            <div
              className="p-5 rounded-3xl border shadow-xl space-y-2.5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              {leaderboard.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Trophy className="w-10 h-10 text-amber-500 animate-bounce mx-auto" />
                  <p className="text-xs font-bold" style={{ color: "var(--muted)" }}>
                    Computing scores & standings...
                  </p>
                </div>
              ) : (
                leaderboard.slice(0, 7).map((lb, i) => {
                  const rankIcons = ["🥇", "🥈", "🥉"];
                  const isTop3 = i < 3;
                  return (
                    <div
                      key={lb.id || i}
                      className="p-3.5 rounded-2xl border flex items-center justify-between transition-all"
                      style={{
                        background: isTop3
                          ? i === 0
                            ? "linear-gradient(90deg, rgba(245, 158, 11, 0.15), var(--card2))"
                            : i === 1
                              ? "linear-gradient(90deg, rgba(148, 163, 184, 0.12), var(--card2))"
                              : "linear-gradient(90deg, rgba(217, 119, 6, 0.1), var(--card2))"
                          : "var(--card2)",
                        borderColor: isTop3
                          ? i === 0
                            ? "rgba(245, 158, 11, 0.4)"
                            : "var(--border)"
                          : "var(--border)"
                      }}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-lg w-7 text-center font-bold">
                          {rankIcons[i] || `#${i + 1}`}
                        </span>
                        <span className="font-extrabold text-sm sm:text-base" style={{ color: "var(--text)" }}>
                          {lb.user?.name || "Participant"}
                        </span>
                      </div>
                      <span
                        className="px-3 py-1 rounded-xl text-xs font-mono font-black"
                        style={{ background: "var(--input)", color: "var(--accent)" }}
                      >
                        {lb.score} PTS
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Next Action Button (Sequential Advance) */}
            <div className="flex justify-center pt-2">
              {hasNextQuestion && nextQuestionObj ? (
                <button
                  onClick={() => handleNextQuestion(nextQuestionObj.id)}
                  className="h-12 px-8 rounded-xl font-bold text-sm text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                >
                  Broadcast Question {currentIdx + 2} of {totalQuestions} →
                </button>
              ) : (
                <button
                  onClick={handleEndQuiz}
                  className="h-12 px-8 rounded-xl font-bold text-sm text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #eab308)" }}
                >
                  <Trophy className="w-4 h-4" /> Reveal Final Winners Podium 🏆
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
             STAGE 2: ACTIVE QUESTION BROADCAST ARENA (ZERO LEAKS OF FUTURE QUESTIONS)
             ========================================================================= */
          <div className="w-full max-w-4xl flex flex-col justify-between space-y-6 animate-in zoom-in-95 duration-300">
            {/* Top Question Status Bar */}
            <div
              className="p-4 px-6 rounded-2xl border flex items-center justify-between shadow-sm"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider"
                  style={{ background: "var(--card2)", color: "var(--accent)" }}
                >
                  Question {currentIdx + 1} / {totalQuestions}
                </span>
                <span
                  className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold text-amber-500 bg-amber-500/10"
                >
                  +{currentQuestion?.points || 1000} PTS
                </span>
              </div>

              {/* Countdown Timer with Warning Pulse */}
              <div
                className={`px-4 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-base font-black transition-all ${timeLeft <= 5 && timeLeft > 0
                    ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                    : "bg-card2 border-border text-text"
                  }`}
                style={timeLeft > 5 ? { background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" } : {}}
              >
                <Clock className={`w-4 h-4 ${timeLeft <= 5 ? "animate-bounce" : ""}`} />
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* Giant Centered Question Text (Projector-Ready) */}
            <div
              className="p-8 sm:p-12 rounded-3xl border shadow-xl text-center space-y-3 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 8%, var(--card)), var(--card))",
                borderColor: "var(--border)"
              }}
            >
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-snug drop-shadow-xs"
                style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
              >
                {currentQuestion?.text}
              </h2>
            </div>

            {/* 4 Kahoot-Style Answer Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQuestion?.options?.map((opt: any, idx: number) => {
                const shape = KAHOOT_SHAPES[idx % KAHOOT_SHAPES.length];
                const isCorrect = correctOptionId === opt.id;

                return (
                  <div
                    key={opt.id || idx}
                    className={`p-6 rounded-3xl border-2 flex items-center gap-4 transition-all duration-300 shadow-md ${isCorrect
                        ? "bg-emerald-500/20 border-emerald-500 ring-4 ring-emerald-500/30 scale-[1.02]"
                        : `bg-gradient-to-br ${shape.bg}`
                      }`}
                  >
                    <span
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${isCorrect ? "bg-emerald-500 text-white" : shape.badge
                        }`}
                    >
                      {shape.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider opacity-75">
                        Option {shape.label}
                      </span>
                      <p className="text-base sm:text-lg font-bold leading-snug truncate">
                        {opt.text}
                      </p>
                    </div>
                    {isCorrect && (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500 text-white flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Host Presentation Control Bar (Discreet & Clean) */}
            <div
              className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                Audience is answering on their mobile devices &bull; {timeLeft > 0 ? `${timeLeft}s left` : "Time expired"}
              </div>

              <div className="flex items-center gap-3">
                {currentQuestion && (
                  <button
                    onClick={() => handleShowLeaderboard(currentQuestion.id)}
                    className="h-10 px-6 rounded-xl font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff" }}
                  >
                    <Trophy className="w-3.5 h-3.5" /> End Round & Show Leaderboard
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
