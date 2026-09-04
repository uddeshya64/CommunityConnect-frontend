"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Gamepad2, Plus, Play, Loader2, Sparkles, CheckCircle2, 
  Clock, HelpCircle, ChevronDown, ChevronUp, Trophy, Trash2 
} from "lucide-react";
import { api } from "@/lib/axios";
import { useToast } from "@/components/providers/ToastProvider";

interface ActivityManagerTabProps {
  eventId: string;
  isOwner: boolean;
  hasPermission: (perm: string) => boolean;
  activeAccent?: any;
  isDark?: boolean;
}

export default function ActivityManagerTab({
  eventId,
  isOwner,
  hasPermission,
  activeAccent = { badgeBg: "bg-indigo-500/10", text: "text-indigo-600", bg: "bg-indigo-600" },
  isDark = false
}: ActivityManagerTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const showToast = (msg: string, type: "success" | "error" = "success") => toast(msg, type);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Quiz Modal / Form State
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Question Modal / Form State
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [timeLimit, setTimeLimit] = useState(20);
  const [options, setOptions] = useState([
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4"
  ]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Accordion for viewing questions
  const [expandedQuizId, setExpandedQuizId] = useState<number | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, [eventId]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/events/${eventId}/quizzes`);
      setQuizzes(res.data.quizzes || res.data || []);
    } catch (error: any) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Activity title is required", "error");
      return;
    }
    try {
      setSubmittingQuiz(true);
      await api.post(`/events/${eventId}/quizzes`, {
        title: title.trim(),
        description: description.trim()
      });
      showToast("Activity / Quiz created successfully!", "success");
      setTitle("");
      setDescription("");
      setIsCreatingQuiz(false);
      fetchQuizzes();
    } catch (error: any) {
      showToast(error.response?.data?.message || error.response?.data?.error || "Failed to create activity", "error");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId || !questionText.trim()) {
      showToast("Question text is required", "error");
      return;
    }

    try {
      setSubmittingQuestion(true);
      const formattedOptions = options.map((optText, idx) => ({
        text: optText.trim() || `Option ${idx + 1}`,
        is_correct: idx === correctIndex
      }));

      await api.post(`/events/${eventId}/quizzes/${selectedQuizId}/questions`, {
        text: questionText.trim(),
        time_limit: Number(timeLimit),
        options: formattedOptions
      });

      showToast("Question added successfully!", "success");
      setQuestionText("");
      setOptions(["Option 1", "Option 2", "Option 3", "Option 4"]);
      setCorrectIndex(0);
      setSelectedQuizId(null);
      setExpandedQuizId(selectedQuizId); // Auto expand to show new question
      fetchQuizzes();
    } catch (error: any) {
      showToast(error.response?.data?.message || error.response?.data?.error || "Failed to add question", "error");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm("Are you sure you want to delete this activity? All questions and participant responses will be permanently removed.")) {
      return;
    }

    try {
      setDeletingQuizId(quizId);
      await api.delete(`/events/${eventId}/quizzes/${quizId}`);
      showToast("Activity deleted successfully", "success");
      fetchQuizzes();
    } catch (error: any) {
      showToast(error.response?.data?.message || error.response?.data?.error || "Failed to delete activity", "error");
    } finally {
      setDeletingQuizId(null);
    }
  };

  const handleDeleteQuestion = async (quizId: number, questionId: number) => {
    try {
      await api.delete(`/events/${eventId}/quizzes/${quizId}/questions/${questionId}`);
      showToast("Question removed", "success");
      fetchQuizzes();
    } catch (error: any) {
      showToast(error.response?.data?.message || error.response?.data?.error || "Failed to delete question", "error");
    }
  };

  const handleStartQuiz = async (quizId: number) => {
    try {
      await api.post(`/events/${eventId}/quizzes/${quizId}/start`);
      showToast("Activity pushed live! Redirecting to host dashboard...", "success");
      router.push(`/dashboard/events/${eventId}/gamification/live?quizId=${quizId}`);
    } catch (error: any) {
      showToast(error.response?.data?.message || error.response?.data?.error || "Failed to push activity live", "error");
    }
  };

  const updateOptionText = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium text-zinc-500">Loading activities & gamification...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-zinc-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-bold uppercase tracking-wider border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Kahoot-Style Live Gamification
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Event Activities & Quizzes</h1>
            <p className="text-indigo-200 text-xs md:text-sm">
              Design interactive quizzes, add questions, and launch live real-time activities for participants during your event sessions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreatingQuiz(true)}
              className="px-5 py-3 rounded-xl bg-white text-indigo-950 font-bold text-xs md:text-sm hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-indigo-600" /> Create Activity
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* CREATE QUIZ FORM / MODAL */}
      {isCreatingQuiz && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md space-y-4 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-indigo-600" /> Plan New Activity / Quiz
            </h3>
            <button 
              onClick={() => setIsCreatingQuiz(false)}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateQuiz} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Activity Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Keynote Trivia Blitz or Tech Quiz Round 1"
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief guidelines or rules for attendees..."
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingQuiz(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={submittingQuiz}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {submittingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Activity
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {selectedQuizId && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-indigo-500/30 dark:border-indigo-500/30 shadow-xl space-y-5 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" /> Add Question to Activity
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Define options and select the correct answer.</p>
            </div>
            <button 
              onClick={() => setSelectedQuizId(null)}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Question Text *
              </label>
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="e.g. Which framework is widely used for frontend web apps?"
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Time Limit (Seconds)
              </label>
              <select
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value={10}>10 Seconds</option>
                <option value={15}>15 Seconds</option>
                <option value={20}>20 Seconds</option>
                <option value={30}>30 Seconds</option>
                <option value={60}>60 Seconds</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Options & Correct Choice *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {options.map((opt, idx) => {
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${idx === correctIndex ? "ring-2 ring-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"}`}
                    >
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={correctIndex === idx}
                        onChange={() => setCorrectIndex(idx)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-black px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOptionText(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 bg-transparent border-none text-xs font-medium focus:outline-none dark:text-white"
                      />
                      {idx === correctIndex && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedQuizId(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingQuestion}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {submittingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Question
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUIZZES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            Planned Activities ({quizzes.length})
          </h2>
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center py-12 px-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">No Activities Planned Yet</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Program Managers and Event Admins can plan trivia games or session quizzes to boost attendee engagement.
            </p>
            <button
              onClick={() => setIsCreatingQuiz(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" /> Create First Activity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const questionCount = quiz.questions?.length || 0;
              const isExpanded = expandedQuizId === quiz.id;

              return (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all"
                >
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">
                          {quiz.title}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          quiz.status === "LIVE" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse" 
                            : quiz.status === "COMPLETED"
                            ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                        }`}>
                          {quiz.status || "DRAFT"}
                        </span>
                        <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <HelpCircle className="w-3 h-3 text-indigo-500" /> {questionCount} {questionCount === 1 ? "Question" : "Questions"}
                        </span>
                      </div>
                      {quiz.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => setSelectedQuizId(quiz.id)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-600" /> Add Question
                      </button>

                      <button
                        onClick={() => setExpandedQuizId(isExpanded ? null : quiz.id)}
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Questions ({questionCount})
                      </button>

                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        disabled={deletingQuizId === quiz.id}
                        className="p-2 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 transition"
                        title="Delete Activity"
                      >
                        {deletingQuizId === quiz.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleStartQuiz(quiz.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Push Live 🚀
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED QUESTIONS LIST */}
                  {isExpanded && (
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
                        Questions Preview ({questionCount})
                      </h4>
                      {questionCount === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No questions added yet. Click &quot;Add Question&quot; above to create options.</p>
                      ) : (
                        <div className="space-y-3">
                          {quiz.questions.map((q: any, qIdx: number) => (
                            <div key={q.id || qIdx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white">
                                <span>{qIdx + 1}. {q.text}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-indigo-500" /> {q.time_limit || 20}s
                                  </span>
                                  <button
                                    onClick={() => handleDeleteQuestion(quiz.id, q.id)}
                                    className="text-zinc-400 hover:text-red-600 transition"
                                    title="Delete Question"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {q.options?.map((opt: any, optIdx: number) => (
                                  <div 
                                    key={opt.id || optIdx} 
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                                      opt.is_correct 
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold" 
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                    }`}
                                  >
                                    <span>{String.fromCharCode(65 + optIdx)}. {opt.text}</span>
                                    {opt.is_correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
