"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Users, Play, Trophy, HelpCircle, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/axios";
import { getSocketBaseUrl } from "@/lib/socket";

export default function LiveOrganizerDashboard() {
  const { id: eventId } = useParams();
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quizId");
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [usersJoined, setUsersJoined] = useState<number>(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [showLeaderboardStage, setShowLeaderboardStage] = useState(false);

  useEffect(() => {
    if (!eventId || !quizId) return;

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
      console.log(`[LiveOrganizerDashboard] Socket connected with ID: ${newSocket.id}`);
      newSocket.emit("join_quiz", { quizId: parseInt(quizId as string), userId: 0 });
      newSocket.emit("start_quiz", { quizId: parseInt(quizId as string) });
    });

    newSocket.on("user_joined", () => {
      setUsersJoined(prev => prev + 1);
    });

    newSocket.on("quiz_started", () => {
      setQuizStarted(true);
    });

    newSocket.on("new_question", (data: any) => {
      setCurrentQuestion(data.question);
      setLeaderboard([]); // hide leaderboard for new question
      setShowLeaderboardStage(false);
    });

    newSocket.on("question_ended", (data: any) => {
      setLeaderboard(data.leaderboard || []);
      setShowLeaderboardStage(true);
    });

    newSocket.on("quiz_ended", (data: any) => {
      setQuizEnded(true);
      setLeaderboard(data.leaderboard || []);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [quizId]);

  const handleStartQuiz = () => {
    socket?.emit("start_quiz", { quizId: parseInt(quizId as string) });
    setQuizStarted(true);
  };

  const handleNextQuestion = (questionId: number) => {
    setShowLeaderboardStage(false);
    socket?.emit("next_question", { quizId: parseInt(quizId as string), questionId });
  };
  
  const handleShowLeaderboard = (questionId: number) => {
    setShowLeaderboardStage(true);
    socket?.emit("end_question", { quizId: parseInt(quizId as string), questionId });
  };

  const handleEndQuiz = () => {
    if (confirm("Are you sure you want to end this live activity session? All participants will be notified that the quiz has ended.")) {
      socket?.emit("end_quiz", { quizId: parseInt(quizId as string) });
      setQuizEnded(true);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto h-[85vh] flex flex-col space-y-6">
      {/* HOST CONTROL HEADER */}
      <div className="flex justify-between items-center bg-gradient-to-r from-zinc-900 via-indigo-950 to-purple-950 text-white p-6 rounded-3xl shadow-xl border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-rose-500 animate-pulse text-lg">🔴</span>
            <h1 className="text-2xl font-black tracking-tight">Host Control Center</h1>
          </div>
          <p className="text-indigo-200 text-xs mt-1">
            {quiz ? quiz.title : `Quiz #${quizId}`} &bull; Live Real-time Broadcast
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-inner">
            <Users className="text-indigo-400 w-5 h-5" />
            <span className="text-2xl font-black">{usersJoined}</span>
            <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider">Players Joined</span>
          </div>

          {!quizEnded && (
            <button
              onClick={handleEndQuiz}
              className="bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-lg transition-all border border-rose-500/30 shrink-0 flex items-center gap-1.5"
            >
              🏁 End Quiz Activity
            </button>
          )}
        </div>
      </div>

      {quizEnded ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-md text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-1">Live Activity Concluded</h2>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              This live activity session has ended. All participants have been notified and shown the final leaderboard results.
            </p>
          </div>

          {leaderboard.length > 0 && (
            <div className="w-full max-w-md bg-zinc-50 dark:bg-zinc-800/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Final Winners & Standings
              </h3>
              <div className="space-y-2">
                {leaderboard.map((lb, i) => (
                  <div key={lb.id || i} className="flex justify-between items-center bg-white dark:bg-zinc-900 p-3 rounded-xl border text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-indigo-600 w-5">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{lb.user?.name || "Participant"}</span>
                    </div>
                    <span className="font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-extrabold">
                      {lb.score} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link href={`/events/${eventId}`}>
            <button className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm rounded-xl transition shadow-md">
              Return to Event Dashboard
            </button>
          </Link>
        </div>
      ) : !quizStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
            <Sparkles className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">Ready to Launch Live Activity</h2>
          <p className="text-zinc-500 text-sm mb-6 max-w-md text-center">
            Clicking &quot;Start Quiz Now&quot; will broadcast a join popup to all active participants in this event.
          </p>
          <button 
            onClick={handleStartQuiz}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-indigo-600/30 transition-all transform hover:scale-105 flex items-center gap-3"
          >
            <Play fill="currentColor" className="w-5 h-5" /> Start Quiz Now
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* MAIN STAGE */}
          <div className="flex-[2] bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col justify-between">
            {showLeaderboardStage ? (
              <div className="flex-1 flex flex-col justify-between space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
                    <Trophy className="w-4 h-4 text-amber-500" /> Round Leaderboard & Standings
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
                    Current Leaderboard
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium">Top players leading this activity round</p>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-12">
                    <Trophy className="w-12 h-12 text-yellow-500 animate-bounce" />
                    <p className="text-sm font-semibold text-zinc-400">Loading standings...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-lg mx-auto w-full my-auto">
                    {leaderboard.map((lb, i) => {
                      const ranks = [
                        "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-400/50 text-amber-700 dark:text-amber-300",
                        "bg-gradient-to-r from-slate-400/20 via-slate-300/10 to-transparent border-slate-300/50 text-slate-700 dark:text-slate-200",
                        "bg-gradient-to-r from-amber-800/20 via-amber-700/10 to-transparent border-amber-600/50 text-amber-800 dark:text-amber-400"
                      ];
                      const rankBadge = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                      const bgClass = ranks[i] || "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200";

                      return (
                        <div 
                          key={lb.id || i} 
                          className={`p-4 rounded-2xl border-2 flex items-center justify-between shadow-sm transition-all ${bgClass}`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xl font-black w-8 text-center">{rankBadge}</span>
                            <span className="font-extrabold text-base md:text-lg">{lb.user?.name || "Participant"}</span>
                          </div>
                          <span className="font-mono bg-white dark:bg-zinc-950 px-3.5 py-1.5 rounded-xl border font-black text-base text-indigo-600 dark:text-indigo-400 shadow-sm">
                            {lb.score} PTS
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={() => {
                      const currentIdx = quiz?.questions?.findIndex((q: any) => q.id === currentQuestion?.id) ?? -1;
                      const nextQ = quiz?.questions?.[currentIdx + 1] || quiz?.questions?.[0];
                      if (nextQ) {
                        handleNextQuestion(nextQ.id);
                      } else {
                        setShowLeaderboardStage(false);
                      }
                    }}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition flex items-center gap-2"
                  >
                    Broadcast Next Question →
                  </button>
                </div>
              </div>
            ) : currentQuestion ? (
              <div className="flex-1 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
                    <span>Active Screen</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock className="w-4 h-4 text-indigo-500" /> {currentQuestion.time_limit || 20}s Limit
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
                    {currentQuestion.text}
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 my-auto">
                  {currentQuestion.options?.map((opt: any, i: number) => {
                    const shapes = [
                      { bg: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400", label: "🔺 Option A" },
                      { bg: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400", label: "🔷 Option B" },
                      { bg: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400", label: "🟡 Option C" },
                      { bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400", label: "🟩 Option D" }
                    ];
                    const shape = shapes[i % 4];
                    return (
                      <div 
                        key={opt.id || i} 
                        className={`p-5 rounded-2xl border-2 flex items-center justify-center text-center font-bold text-base transition-all ${shape.bg}`}
                      >
                        {opt.text}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-center pt-4">
                  <button 
                    onClick={() => handleShowLeaderboard(currentQuestion.id)}
                    className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/20 transition flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4" /> End Time & Show Leaderboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <Trophy className="w-16 h-16 text-yellow-500 animate-bounce" />
                <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">Activity is Live!</h2>
                <p className="text-xs text-zinc-400 max-w-xs text-center">
                  Select a question from the control sidebar on the right to broadcast to players.
                </p>
              </div>
            )}
          </div>
          
          {/* SIDEBAR CONTROLS */}
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
            {leaderboard.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                  <Trophy className="text-yellow-500 w-5 h-5" /> Top 5 Leaderboard
                </h3>
                <div className="space-y-2">
                  {leaderboard.map((lb, i) => (
                    <div key={lb.id || i} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-indigo-600 w-4">{i + 1}</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{lb.user?.name || "Participant"}</span>
                      </div>
                      <span className="font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md font-extrabold">
                        {lb.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 flex-1 space-y-4">
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" /> Broadcast Questions ({quiz?.questions?.length || 0})
              </h3>
              
              {!quiz?.questions || quiz.questions.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No questions found for this activity.</p>
              ) : (
                <div className="space-y-3">
                  {quiz.questions.map((q: any, idx: number) => (
                    <button 
                      key={q.id || idx}
                      onClick={() => handleNextQuestion(q.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                        currentQuestion?.id === q.id && !showLeaderboardStage
                          ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500/50 text-indigo-900 dark:text-indigo-200"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 transition">
                          Q{idx + 1}: {q.text}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {q.options?.length || 0} Options &bull; {q.time_limit || 20}s Limit
                        </p>
                      </div>
                      <Play className="w-4 h-4 text-indigo-600 shrink-0 fill-current" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
