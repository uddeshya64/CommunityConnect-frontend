"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Gamepad2, Plus, Play, Loader2, Sparkles, CheckCircle2,
  Clock, HelpCircle, ChevronDown, ChevronUp, Trophy, Trash2,
  Pencil, X, RotateCcw
} from "lucide-react";
import { api } from "@/lib/axios";
import { useToast } from "@/components/providers/ToastProvider";
import AiQuizBuilderModal from "./AiQuizBuilderModal";

interface ActivityManagerTabProps {
  eventId: string;
  eventTitle?: string;
  isOwner: boolean;
  hasPermission: (perm: string) => boolean;
  activeAccent?: any;
  isDark?: boolean;
}

const emptySubscribe = () => () => {};

export default function ActivityManagerTab({
  eventId,
  eventTitle = "Event",
  isOwner,
  hasPermission,
  activeAccent = { badgeBg: "bg-indigo-500/10", text: "text-indigo-600", bg: "bg-indigo-600" },
  isDark = false
}: ActivityManagerTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const showToast = (msg: string, type: "success" | "error" = "success") => toast(msg, type);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Quiz Builder Modal State
  const [isAiQuizModalOpen, setIsAiQuizModalOpen] = useState(false);

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

  // Edit Question Modal State
  const [editingQuestion, setEditingQuestion] = useState<{
    quizId: number;
    questionId: number;
    text: string;
    timeLimit: number;
    options: Array<{ id?: number; text: string; is_correct: boolean }>;
  } | null>(null);
  const [submittingEditQuestion, setSubmittingEditQuestion] = useState(false);

  // Edit Quiz (Title/Description) Modal State
  const [editingQuiz, setEditingQuiz] = useState<{
    id: number;
    title: string;
    description: string;
  } | null>(null);
  const [submittingEditQuiz, setSubmittingEditQuiz] = useState(false);

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

  const handleOpenEditQuestion = (quizId: number, question: any) => {
    setEditingQuestion({
      quizId,
      questionId: question.id,
      text: question.text || "",
      timeLimit: question.time_limit || 20,
      options: (question.options && question.options.length > 0)
        ? question.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text || "",
            is_correct: !!opt.is_correct
          }))
        : [
            { text: "Option A", is_correct: true },
            { text: "Option B", is_correct: false },
            { text: "Option C", is_correct: false },
            { text: "Option D", is_correct: false }
          ]
    });
  };

  const updateEditingOptionText = (idx: number, val: string) => {
    if (!editingQuestion) return;
    const nextOptions = [...editingQuestion.options];
    nextOptions[idx] = { ...nextOptions[idx], text: val };
    setEditingQuestion({ ...editingQuestion, options: nextOptions });
  };

  const setEditingCorrectOption = (idx: number) => {
    if (!editingQuestion) return;
    const nextOptions = editingQuestion.options.map((opt, i) => ({
      ...opt,
      is_correct: i === idx
    }));
    setEditingQuestion({ ...editingQuestion, options: nextOptions });
  };

  const addOptionToEditing = () => {
    if (!editingQuestion || editingQuestion.options.length >= 6) return;
    setEditingQuestion({
      ...editingQuestion,
      options: [
        ...editingQuestion.options,
        { text: `Option ${String.fromCharCode(65 + editingQuestion.options.length)}`, is_correct: false }
      ]
    });
  };

  const removeOptionFromEditing = (idx: number) => {
    if (!editingQuestion || editingQuestion.options.length <= 2) return;
    const wasCorrect = editingQuestion.options[idx].is_correct;
    const nextOptions = editingQuestion.options.filter((_, i) => i !== idx);
    if (wasCorrect && nextOptions.length > 0) {
      nextOptions[0].is_correct = true;
    }
    setEditingQuestion({ ...editingQuestion, options: nextOptions });
  };

  const handleSaveEditedQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    if (!editingQuestion.text.trim()) {
      showToast("Question text cannot be empty", "error");
      return;
    }
    if (!editingQuestion.options.some((o) => o.is_correct)) {
      showToast("Please mark at least one option as correct", "error");
      return;
    }

    try {
      setSubmittingEditQuestion(true);
      await api.put(
        `/events/${eventId}/quizzes/${editingQuestion.quizId}/questions/${editingQuestion.questionId}`,
        {
          text: editingQuestion.text.trim(),
          time_limit: Number(editingQuestion.timeLimit),
          options: editingQuestion.options.map((opt, i) => ({
            text: opt.text.trim() || `Option ${String.fromCharCode(65 + i)}`,
            is_correct: opt.is_correct
          }))
        }
      );
      showToast("Question updated successfully!", "success");
      setEditingQuestion(null);
      fetchQuizzes();
    } catch (error: any) {
      showToast(error.response?.data?.message || error.response?.data?.error || "Failed to update question", "error");
    } finally {
      setSubmittingEditQuestion(false);
    }
  };

  const handleSaveEditedQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuiz) return;
    if (!editingQuiz.title.trim()) {
      showToast("Activity title cannot be empty", "error");
      return;
    }

    try {
      setSubmittingEditQuiz(true);
      await api.put(`/events/${eventId}/quizzes/${editingQuiz.id}`, {
        title: editingQuiz.title.trim(),
        description: editingQuiz.description.trim()
      });
      showToast("Activity details updated!", "success");
      setEditingQuiz(null);
      fetchQuizzes();
    } catch (error: any) {
      showToast(error.response?.data?.message || error.response?.data?.error || "Failed to update activity", "error");
    } finally {
      setSubmittingEditQuiz(false);
    }
  };

  const [resettingQuizId, setResettingQuizId] = useState<number | null>(null);

  const handleResetQuiz = async (quizId: number) => {
    try {
      setResettingQuizId(quizId);
      await api.post(`/events/${eventId}/quizzes/${quizId}/reset`);
      showToast("Activity results reset! Ready for a fresh game.", "success");
      fetchQuizzes();
    } catch (error: any) {
      showToast(error.response?.data?.message || error.response?.data?.error || "Failed to reset activity", "error");
    } finally {
      setResettingQuizId(null);
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>Loading activities & quizzes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP AI BANNER (MATCHING STANDALONE PROTOTYPE) */}
      <div
        className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
        style={{
          background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 14%, var(--card)), var(--card))",
          border: "1px solid color-mix(in oklab, var(--accent) 30%, var(--border))",
          boxShadow: "0 2px 12px color-mix(in oklab, var(--accent) 8%, transparent)"
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff" }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}
            >
              Generate a quiz with AI
            </h2>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--muted)" }}>
              Describe a topic — get questions, distractors, and timings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setIsAiQuizModalOpen(true)}
            className="h-9 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer shadow-xs flex items-center gap-2"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate
          </button>
          <button
            onClick={() => setIsCreatingQuiz(true)}
            className="h-9 px-4 rounded-xl font-semibold text-xs sm:text-sm border transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer flex items-center gap-1.5"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <Plus className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> Manual Activity
          </button>
        </div>
      </div>

      {/* CREATE QUIZ FORM / MODAL */}
      {isCreatingQuiz && (
        <div
          className="p-6 rounded-2xl border shadow-md space-y-4 animate-in slide-in-from-top-4"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
              <Gamepad2 className="w-5 h-5" style={{ color: "var(--accent)" }} /> Plan New Activity / Quiz
            </h3>
            <button
              onClick={() => setIsCreatingQuiz(false)}
              className="text-xs font-bold hover:underline cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateQuiz} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                Activity Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Keynote Trivia Blitz or Tech Quiz Round 1"
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief guidelines or rules for attendees..."
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none resize-none"
                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingQuiz(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={submittingQuiz}
                className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
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
        <div
          className="p-6 rounded-2xl border shadow-xl space-y-5 animate-in slide-in-from-top-4"
          style={{ background: "var(--card)", borderColor: "var(--accent)" }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                <HelpCircle className="w-5 h-5" style={{ color: "var(--accent)" }} /> Add Question to Activity
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Define options and select the correct answer.</p>
            </div>
            <button
              onClick={() => setSelectedQuizId(null)}
              className="text-xs font-bold hover:underline cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                Question Text *
              </label>
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="e.g. Which framework is widely used for frontend web apps?"
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                Time Limit (Seconds)
              </label>
              <select
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-xl text-xs font-bold outline-none"
                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                <option value={10}>10 Seconds</option>
                <option value={15}>15 Seconds</option>
                <option value={20}>20 Seconds</option>
                <option value={30}>30 Seconds</option>
                <option value={60}>60 Seconds</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Options & Correct Choice *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {options.map((opt, idx) => {
                  const isCorrect = idx === correctIndex;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center gap-3 transition-all"
                      style={{
                        background: isCorrect ? "color-mix(in oklab, var(--accent) 10%, var(--card))" : "var(--card2)",
                        borderColor: isCorrect ? "var(--accent)" : "var(--border)"
                      }}
                    >
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={isCorrect}
                        onChange={() => setCorrectIndex(idx)}
                        className="w-4 h-4 cursor-pointer"
                        style={{ accentColor: "var(--accent)" }}
                      />
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md" style={{ background: "var(--input)", color: "var(--text)" }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOptionText(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 bg-transparent border-none text-xs font-medium focus:outline-none"
                        style={{ color: "var(--text)" }}
                      />
                      {isCorrect && (
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
                className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingQuestion}
                className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
              >
                {submittingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Question
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. QUIZZES GRID / EMPTY STATE (MATCHING STANDALONE PROTOTYPE) */}
      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <div
            className="text-center py-12 px-4 rounded-2xl border border-dashed space-y-3"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "var(--card2)", color: "var(--accent)" }}
            >
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3
              className="font-bold text-base"
              style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}
            >
              No Activities Planned Yet
            </h3>
            <p className="text-xs max-w-sm mx-auto" style={{ color: "var(--muted)" }}>
              Program Managers and Event Admins can plan trivia games or session quizzes to boost attendee engagement.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsAiQuizModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
              >
                <Sparkles className="w-4 h-4 text-white" /> Generate with AI
              </button>
              <button
                onClick={() => setIsCreatingQuiz(true)}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5"
                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                <Plus className="w-4 h-4" style={{ color: "var(--accent)" }} /> Manual Activity
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => {
              const questionCount = quiz.questions?.length || 0;
              const isExpanded = expandedQuizId === quiz.id;
              const isLive = quiz.status === "LIVE";

              return (
                <div
                  key={quiz.id}
                  className="rounded-2xl border shadow-xs flex flex-col justify-between overflow-hidden transition-all duration-200"
                  style={{
                    background: "var(--card)",
                    borderColor: isLive ? "color-mix(in oklab, #10b981 50%, var(--border))" : "var(--border)",
                    backdropFilter: "blur(20px)"
                  }}
                >
                  <div className="p-5 space-y-3.5">
                    {/* Top Row: Status Badge & Card Tools */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                        style={
                          isLive
                            ? { background: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }
                            : quiz.status === "COMPLETED"
                              ? { background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }
                              : { background: "var(--card2)", color: "var(--muted)", border: "1px solid var(--border)" }
                        }
                      >
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {quiz.status || "DRAFT"}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingQuiz({ id: quiz.id, title: quiz.title, description: quiz.description || "" })}
                          className="p-1.5 rounded-lg border text-xs font-medium hover:opacity-80 transition cursor-pointer"
                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--muted)" }}
                          title="Edit Activity Details"
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                        </button>
                        <button
                          onClick={() => setSelectedQuizId(quiz.id)}
                          className="p-1.5 rounded-lg border text-xs font-medium hover:opacity-80 transition cursor-pointer"
                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--muted)" }}
                          title="Add Question"
                        >
                          <Plus className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                        </button>
                        <button
                          onClick={() => setExpandedQuizId(isExpanded ? null : quiz.id)}
                          className="p-1.5 rounded-lg border text-xs font-medium hover:opacity-80 transition cursor-pointer"
                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--muted)" }}
                          title={isExpanded ? "Hide Questions" : "View Questions"}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          disabled={deletingQuizId === quiz.id}
                          className="p-1.5 rounded-lg border text-xs font-medium text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}
                          title="Delete Activity"
                        >
                          {deletingQuizId === quiz.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Title & Question Count */}
                    <div>
                      <h3
                        className="text-base sm:text-lg font-bold tracking-tight line-clamp-1"
                        style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}
                      >
                        {quiz.title}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: "var(--subtle)" }}>
                        {questionCount} {questionCount === 1 ? "question" : "questions"}
                      </p>
                      {quiz.description && (
                        <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "var(--muted)" }}>
                          {quiz.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Button: Open live arena & Reset */}
                  <div className="p-5 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="flex-1 h-9 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
                      style={
                        isLive
                          ? { background: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.4)", color: "#10b981" }
                          : quiz.status === "COMPLETED"
                            ? { background: "color-mix(in oklab, var(--accent) 15%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)" }
                            : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
                      }
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {quiz.status === "COMPLETED" ? "Play Again (Fresh Game)" : "Open live arena"}
                    </button>

                    {quiz.status === "COMPLETED" && (
                      <button
                        onClick={() => handleResetQuiz(quiz.id)}
                        disabled={resettingQuizId === quiz.id}
                        className="h-9 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold text-xs cursor-pointer transition-all hover:scale-[1.01] active:scale-95 text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                        title="Reset all results, scores, and participants"
                      >
                        {resettingQuizId === quiz.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Reset</span>
                      </button>
                    )}
                  </div>

                  {/* Expanded Questions Accordion */}
                  {isExpanded && (
                    <div className="p-4 border-t space-y-3" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between text-xs font-mono font-bold uppercase" style={{ color: "var(--muted)" }}>
                        <span>Questions ({questionCount})</span>
                      </div>
                      {questionCount === 0 ? (
                        <p className="text-xs italic" style={{ color: "var(--subtle)" }}>
                          No questions added yet. Click &quot;+&quot; above to add questions.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                          {quiz.questions.map((q: any, qIdx: number) => (
                            <div
                              key={q.id || qIdx}
                              className="p-3 rounded-xl border text-xs space-y-1.5"
                              style={{ background: "var(--card)", borderColor: "var(--border)" }}
                            >
                              <div className="flex items-center justify-between font-bold" style={{ color: "var(--text)" }}>
                                <span>{qIdx + 1}. {q.text}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px]" style={{ color: "var(--subtle)" }}>
                                    {q.time_limit || 20}s
                                  </span>
                                  <button
                                    onClick={() => handleOpenEditQuestion(quiz.id, q)}
                                    className="p-1 rounded-md hover:opacity-80 transition cursor-pointer"
                                    style={{ color: "var(--accent)" }}
                                    title="Edit Question & Choices"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestion(quiz.id, q.id)}
                                    className="text-red-500 hover:opacity-80 cursor-pointer p-1 rounded-md"
                                    title="Delete Question"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                {q.options?.map((opt: any, optIdx: number) => (
                                  <div
                                    key={opt.id || optIdx}
                                    className="px-2 py-1 rounded-md text-[11px] truncate flex items-center justify-between"
                                    style={
                                      opt.is_correct
                                        ? { background: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontWeight: 600 }
                                        : { background: "var(--card2)", color: "var(--muted)" }
                                    }
                                  >
                                    <span className="truncate">{String.fromCharCode(65 + optIdx)}. {opt.text}</span>
                                    {opt.is_correct && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
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

      {/* AI QUIZ BUILDER MODAL */}
      <AiQuizBuilderModal
        isOpen={isAiQuizModalOpen}
        onClose={() => setIsAiQuizModalOpen(false)}
        eventId={eventId}
        eventTitle={eventTitle}
        isDark={isDark}
        onQuizCreated={(newQuiz) => {
          fetchQuizzes();
          if (newQuiz?.id) {
            setExpandedQuizId(newQuiz.id);
          }
        }}
      />

      {/* EDIT QUESTION & OPTIONS MODAL */}
      {isClient && editingQuestion && createPortal(
        <div
          className={`fixed inset-0 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${
            isDark ? "bg-black/75" : "bg-slate-950/40"
          }`}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                >
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                    Edit Question & Choices
                  </h3>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Update question wording, timings, and answer choices.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer"
                style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveEditedQuestion} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                  Question Text *
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                  placeholder="Enter the question text..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none resize-none"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                  Time Limit (Seconds)
                </label>
                <select
                  value={editingQuestion.timeLimit}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, timeLimit: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  <option value={10}>10 Seconds</option>
                  <option value={15}>15 Seconds</option>
                  <option value={20}>20 Seconds</option>
                  <option value={30}>30 Seconds</option>
                  <option value={45}>45 Seconds</option>
                  <option value={60}>60 Seconds</option>
                  <option value={90}>90 Seconds</option>
                  <option value={120}>120 Seconds</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Options & Correct Choice *
                  </label>
                  {editingQuestion.options.length < 6 && (
                    <button
                      type="button"
                      onClick={addOptionToEditing}
                      className="text-xs font-bold flex items-center gap-1 cursor-pointer hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {editingQuestion.options.map((opt, idx) => {
                    const isCorrect = opt.is_correct;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border flex items-center gap-3 transition-all"
                        style={{
                          background: isCorrect ? "color-mix(in oklab, var(--accent) 10%, var(--card))" : "var(--card2)",
                          borderColor: isCorrect ? "var(--accent)" : "var(--border)"
                        }}
                      >
                        <input
                          type="radio"
                          name="editCorrectAnswer"
                          checked={isCorrect}
                          onChange={() => setEditingCorrectOption(idx)}
                          className="w-4 h-4 cursor-pointer shrink-0"
                          style={{ accentColor: "var(--accent)" }}
                          title="Mark as correct answer"
                        />
                        <span
                          className="text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0"
                          style={{ background: "var(--input)", color: "var(--text)" }}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => updateEditingOptionText(idx, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 bg-transparent border-none text-xs font-medium focus:outline-none"
                          style={{ color: "var(--text)" }}
                        />
                        {isCorrect && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
                            Correct
                          </span>
                        )}
                        {editingQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOptionFromEditing(idx)}
                            className="text-red-500 hover:opacity-80 p-1 rounded transition cursor-pointer shrink-0"
                            title="Remove choice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                  style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditQuestion}
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                >
                  {submittingEditQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT ACTIVITY DETAILS MODAL */}
      {isClient && editingQuiz && createPortal(
        <div
          className={`fixed inset-0 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${
            isDark ? "bg-black/75" : "bg-slate-950/40"
          }`}
        >
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                >
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                    Edit Activity Details
                  </h3>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Update the title or description for this activity.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingQuiz(null)}
                className="p-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer"
                style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedQuiz} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                  Activity Title *
                </label>
                <input
                  type="text"
                  value={editingQuiz.title}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                  placeholder="e.g. Keynote Trivia Blitz"
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editingQuiz.description}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                  placeholder="Brief guidelines or rules for attendees..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none resize-none"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setEditingQuiz(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                  style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditQuiz}
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                >
                  {submittingEditQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
