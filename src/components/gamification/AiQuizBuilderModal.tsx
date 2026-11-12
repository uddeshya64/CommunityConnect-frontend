"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Mic,
  MicOff,
  Wand2,
  Plus,
  Trash2,
  Clock,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Bot,
  HelpCircle,
  Trophy,
  Check,
  ChevronRight,
  ChevronLeft,
  Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { AI_SPEECH_LANG } from "@/config/env";
import { api } from "@/lib/axios";
import { aiEventService } from "@/services/aiEvent.service";

export interface EditableOption {
  text: string;
  is_correct: boolean;
}

export interface EditableQuestion {
  id: string;
  text: string;
  time_limit: number;
  points: number;
  options: EditableOption[];
}

interface AiQuizBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number | string;
  eventTitle: string;
  isDark?: boolean;
  onQuizCreated: (newQuiz: any) => void;
}

const SAMPLE_QUIZ_PROMPTS = [
  "⚡ JavaScript, React & Web Dev Blitz with 4 questions",
  "🎬 Bollywood Classics & 90s Pop Culture Trivia",
  "🧠 AI, Cloud Computing & Modern Tech Trivia",
  "🎉 Fun Event Icebreaker & General Community Trivia",
  "🍕 Food, Music & Worldwide Culture Quiz",
];

const TIME_LIMIT_OPTIONS = [15, 20, 30, 45, 60];
const POINTS_OPTIONS = [500, 1000, 1500, 2000];

interface SpeechEvent {
  resultIndex?: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0?: { transcript?: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

const emptySubscribe = () => () => { };

function createDefaultQuestion(): EditableQuestion {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    text: "",
    time_limit: 20,
    points: 1000,
    options: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  };
}

export default function AiQuizBuilderModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  isDark: isDarkProp,
  onQuizCreated,
}: AiQuizBuilderModalProps) {
  const { isDark: themeIsDark, activeAccent } = useAppearance();
  const isDark = isDarkProp ?? themeIsDark;
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { toast } = useToast();
  const showToast = (msg: string, type: "success" | "error" = "success") => toast(msg, type);

  // Prompt & Generation state
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<"gemini" | "local" | null>(null);

  // Quiz Editor state
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalSpeechTranscriptRef = useRef<string>("");

  // Stop speech recognition helper
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors on stopping
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  // Cleanup speech on modal close & lock body scroll while open
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isSaving, onClose, stopListening]);

  // Speech Recognition toggler
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      setSpeechError("Speech recognition is not supported in this browser. Please type your prompt.");
      return;
    }

    setSpeechError("");
    finalSpeechTranscriptRef.current = "";

    try {
      const recognition = new SpeechRec();
      recognition.lang = AI_SPEECH_LANG || "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechEvent) => {
        let interim = "";
        let finalChunk = "";

        const startIndex = event.resultIndex || 0;
        for (let i = startIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalChunk += text + " ";
          } else {
            interim += text;
          }
        }

        if (finalChunk) {
          finalSpeechTranscriptRef.current = (finalSpeechTranscriptRef.current + " " + finalChunk).trim();
          setPrompt((prev) => {
            const prefix = prev.trim();
            return prefix ? `${prefix} ${finalChunk.trim()}` : finalChunk.trim();
          });
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        if (err.error !== "no-speech") {
          setSpeechError(`Voice input error: ${err.error || "unavailable"}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setSpeechError("Could not start microphone. Please check permissions.");
      setIsListening(false);
    }
  }, [isListening, stopListening]);

  // AI Quiz Generation handler
  const handleGenerate = async (overridePrompt?: string) => {
    const textToUse = (overridePrompt ?? prompt).trim();
    if (!textToUse) {
      showToast("Please enter a topic or prompt for the quiz", "error");
      return;
    }

    stopListening();
    setIsGenerating(true);

    try {
      const result = await aiEventService.generateQuiz({
        eventId,
        prompt: textToUse,
        currentQuiz:
          quizTitle || questions.length > 0
            ? {
              title: quizTitle,
              description: quizDescription,
              questions: questions.map((q) => ({
                text: q.text,
                time_limit: q.time_limit,
                points: q.points,
                options: q.options,
              })),
            }
            : undefined,
      });

      if (!result?.quiz) {
        throw new Error("No quiz returned by the AI service");
      }

      setAiReply(result.reply || "Quiz created successfully!");
      setGenerationSource(result.source);
      setQuizTitle(result.quiz.title || "Live Trivia Quiz");
      setQuizDescription(result.quiz.description || "");

      // Map questions with unique IDs
      const mappedQuestions: EditableQuestion[] = (result.quiz.questions || []).map((q, idx) => ({
        id: `q-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        text: q.text,
        time_limit: q.time_limit || 20,
        points: q.points || 1000,
        options: (q.options || []).map((opt) => ({
          text: opt.text,
          is_correct: Boolean(opt.is_correct),
        })),
      }));

      setQuestions(mappedQuestions);
      setActiveQuestionIndex(0);
      showToast(
        `Generated ${mappedQuestions.length} questions for "${result.quiz.title}"!`,
        "success"
      );
    } catch (err: any) {
      console.error("Error generating quiz:", err);
      showToast(err?.response?.data?.error || err.message || "Failed to generate quiz", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Question editing helpers
  const updateQuestionText = (text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      if (next[activeQuestionIndex]) {
        next[activeQuestionIndex] = { ...next[activeQuestionIndex], text };
      }
      return next;
    });
  };

  const updateQuestionTimeLimit = (time_limit: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      if (next[activeQuestionIndex]) {
        next[activeQuestionIndex] = { ...next[activeQuestionIndex], time_limit };
      }
      return next;
    });
  };

  const updateQuestionPoints = (points: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      if (next[activeQuestionIndex]) {
        next[activeQuestionIndex] = { ...next[activeQuestionIndex], points };
      }
      return next;
    });
  };

  const updateOptionText = (optionIndex: number, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[activeQuestionIndex];
      if (q) {
        const nextOpts = [...q.options];
        if (nextOpts[optionIndex]) {
          nextOpts[optionIndex] = { ...nextOpts[optionIndex], text };
          next[activeQuestionIndex] = { ...q, options: nextOpts };
        }
      }
      return next;
    });
  };

  const setCorrectOption = (optionIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[activeQuestionIndex];
      if (q) {
        const nextOpts = q.options.map((opt, i) => ({
          ...opt,
          is_correct: i === optionIndex,
        }));
        next[activeQuestionIndex] = { ...q, options: nextOpts };
      }
      return next;
    });
  };

  const handleAddQuestion = () => {
    const newQ = createDefaultQuestion();
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = (indexToDelete: number) => {
    if (questions.length <= 1) {
      showToast("Quiz must have at least one question", "error");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== indexToDelete));
    if (activeQuestionIndex >= questions.length - 1) {
      setActiveQuestionIndex(Math.max(0, questions.length - 2));
    }
  };

  // Submit & Save AI-Generated Activity to database
  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      showToast("Activity Title is required", "error");
      return;
    }

    if (questions.length === 0) {
      showToast("Please add at least one question", "error");
      return;
    }

    // Validate that questions and options are filled
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        showToast(`Question ${i + 1} text is empty`, "error");
        setActiveQuestionIndex(i);
        return;
      }
      const hasCorrect = q.options.some((o) => o.is_correct);
      if (!hasCorrect) {
        showToast(`Question ${i + 1} has no correct answer marked`, "error");
        setActiveQuestionIndex(i);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          showToast(`Question ${i + 1}, Option ${j + 1} is empty`, "error");
          setActiveQuestionIndex(i);
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      const res = await api.post(`/events/${eventId}/quizzes`, {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        questions: questions.map((q, idx) => ({
          text: q.text.trim(),
          time_limit: q.time_limit,
          points: q.points,
          order: idx,
          options: q.options.map((opt) => ({
            text: opt.text.trim(),
            is_correct: opt.is_correct,
          })),
        })),
      });

      showToast(
        `Activity "${quizTitle}" created with ${questions.length} questions!`,
        "success"
      );
      onQuizCreated(res.data?.quiz || res.data);
      onClose();
    } catch (err: any) {
      console.error("Save quiz error:", err);
      showToast(
        err?.response?.data?.message || err?.response?.data?.error || "Failed to create activity",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !isClient) return null;

  const currentQ = questions[activeQuestionIndex];

  return createPortal(
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-md animate-in fade-in duration-200 ${isDark ? "bg-black/75" : "bg-slate-950/40"
        }`}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col border rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        {/* MODAL HEADER */}
        <div
          className="flex items-start sm:items-center justify-between p-4 sm:px-6 sm:py-4 border-b"
          style={{
            borderColor: "var(--border)",
            background:
              "linear-gradient(110deg, color-mix(in oklab, var(--accent) 10%, var(--card)), color-mix(in oklab, var(--accent2) 6%, var(--card)) 48%, var(--card))",
          }}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shrink-0 mt-0.5 sm:mt-0"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                boxShadow: "0 8px 20px -6px color-mix(in oklab, var(--accent) 55%, transparent)",
              }}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-extrabold" style={{ color: "var(--text)" }}>
                  AI Quiz &amp; Activity Builder
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                    borderColor: "color-mix(in oklab, var(--accent) 28%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  Interactive Live Trivia
                </span>
              </div>
              <p className="text-[11px] sm:text-xs line-clamp-1 sm:line-clamp-none mt-0.5" style={{ color: "var(--muted)" }}>
                Craft engaging multiple-choice trivia and live challenges for{" "}
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  &quot;{eventTitle}&quot;
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border transition-colors hover:opacity-80 cursor-pointer"
            style={{
              background: "var(--card2)",
              borderColor: "var(--border)",
              color: "var(--muted)",
            }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (TWO PANELS) */}
        <div
          className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x"
          style={{ borderColor: "var(--border)" }}
        >
          {/* LEFT PANEL: PROMPT & AUDIO INPUT (5 COLS) */}
          <div
            className="lg:col-span-5 p-5 md:p-6 space-y-5 flex flex-col"
            style={{
              background: "color-mix(in oklab, var(--card2) 55%, var(--card))",
              borderColor: "var(--border)",
            }}
          >
            <div className="space-y-1">
              <Label
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "var(--muted)" }}
              >
                <Bot className="w-4 h-4" style={{ color: "var(--accent)" }} />
                Prompt or Speak Your Topic
              </Label>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Specify the subject, difficulty, or number of questions. Voice or text prompt persists for easy revisions.
              </p>
            </div>

            {/* PROMPT TEXTAREA & VOICE RECORDER */}
            <div
              className={`relative rounded-2xl border-2 transition-all shadow-sm focus-within:ring-2 ${activeAccent.ring}`}
              style={{
                background: "var(--input)",
                borderColor: "var(--border)",
              }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. Create a 4-question trivia quiz on JavaScript ES6, React hooks, and web APIs with fun options..."
                className="w-full p-4 pb-14 text-sm bg-transparent outline-none resize-none"
                style={{ color: "var(--text)" }}
              />

              {/* Interim voice feedback */}
              {isListening && interimTranscript && (
                <div className="px-4 pb-2 text-xs italic truncate" style={{ color: "var(--accent)" }}>
                  &quot;{interimTranscript}&quot;
                </div>
              )}

              {/* Bottom bar of prompt box */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${isListening ? "bg-rose-500 text-white animate-pulse" : "border hover:opacity-90"
                      }`}
                    style={
                      isListening
                        ? undefined
                        : {
                          background: "var(--card2)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }
                    }
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                        <span>Voice Prompt</span>
                      </>
                    )}
                  </button>

                  {isListening && (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-2.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>

                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="text-[11px] font-semibold transition-colors hover:opacity-80 cursor-pointer"
                    style={{ color: "var(--muted)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {speechError && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {speechError}
              </p>
            )}

            {/* SUGGESTED PROMPT PILLS */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--subtle)" }}>
                Suggested Topics
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_QUIZ_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(p);
                      handleGenerate(p);
                    }}
                    disabled={isGenerating}
                    className="text-left px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    style={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* GENERATE ACTION BUTTON */}
            <Button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || (!prompt.trim() && !isListening)}
              className="w-full py-5 rounded-2xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-95 cursor-pointer border-0"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                boxShadow: "0 10px 26px -8px color-mix(in oklab, var(--accent) 55%, transparent)",
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI is crafting questions &amp; options...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>{questions.length > 0 ? "Update Quiz via Prompt" : "Generate Quiz Activity"}</span>
                </>
              )}
            </Button>

            {/* AI FEEDBACK BUBBLE */}
            {aiReply && (
              <div
                className="p-3.5 rounded-2xl border space-y-1.5 animate-in fade-in"
                style={{
                  background: "color-mix(in oklab, var(--accent) 9%, var(--card))",
                  borderColor: "color-mix(in oklab, var(--accent) 26%, transparent)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold flex items-center gap-1.5"
                    style={{ color: "var(--accent)" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    AI Assistant
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase"
                    style={{ color: "var(--accent)", opacity: 0.85 }}
                  >
                    {generationSource === "gemini" ? "Gemini AI" : "Local Engine"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  {aiReply}
                </p>
              </div>
            )}

            <div className="mt-auto pt-2 text-[11px] text-center" style={{ color: "var(--subtle)" }}>
              Tip: Click on any option in the preview on the right to set it as the correct answer.
            </div>
          </div>

          {/* RIGHT PANEL: QUIZ TITLE, DESCRIPTION & INTERACTIVE QUESTION REVIEW (7 COLS) */}
          <div
            className="lg:col-span-7 p-5 md:p-6 space-y-5 flex flex-col overflow-y-auto"
            style={{ borderColor: "var(--border)" }}
          >
            {/* QUIZ TITLE & DESCRIPTION EDIT */}
            <div
              className="p-4 rounded-2xl border space-y-3 shadow-xs"
              style={{
                background: "var(--card2)",
                borderColor: "var(--border)",
              }}
            >
              <div>
                <Label
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: "var(--muted)" }}
                >
                  Activity / Quiz Title *
                </Label>
                <Input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. Fullstack & Web Dev Blitz"
                  className="mt-1 font-bold text-base h-11 rounded-xl"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div>
                <Label
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: "var(--muted)" }}
                >
                  Description
                </Label>
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description or guidelines for participants..."
                  className={`mt-1 w-full p-2.5 rounded-xl border text-xs outline-none resize-none focus:ring-2 ${activeAccent.ring}`}
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </div>

            {/* QUESTIONS REVIEW SECTION */}
            {questions.length === 0 ? (
              <div
                className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed space-y-3"
                style={{
                  borderColor: "var(--border)",
                  background: "color-mix(in oklab, var(--card2) 45%, transparent)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                    borderColor: "color-mix(in oklab, var(--accent) 26%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                    No Questions Generated Yet
                  </h4>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Use the prompt on the left to generate questions automatically, or click below to manually add one.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleAddQuestion}
                  variant="outline"
                  className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> Add Blank Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col">
                {/* QUESTION TABS STRIP */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {questions.map((q, idx) => {
                      const isActive = idx === activeQuestionIndex;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setActiveQuestionIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${isActive ? "text-white" : "border hover:opacity-85"
                            }`}
                          style={
                            isActive
                              ? {
                                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                                boxShadow: "0 6px 16px -6px color-mix(in oklab, var(--accent) 60%, transparent)",
                              }
                              : {
                                background: "var(--card2)",
                                borderColor: "var(--border)",
                                color: "var(--muted)",
                              }
                          }
                        >
                          <span>Q{idx + 1}</span>
                          {q.options.some((o) => o.is_correct) ? (
                            <Check className={`w-3 h-3 ${isActive ? "text-white" : "text-emerald-500"}`} />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                          )}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-2.5 py-1.5 rounded-xl border border-dashed text-xs font-bold transition-colors shrink-0 flex items-center gap-1 hover:opacity-80 cursor-pointer"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--muted)",
                      }}
                      title="Add Question"
                    >
                      <Plus className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold" style={{ color: "var(--subtle)" }}>
                      {activeQuestionIndex + 1} of {questions.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(activeQuestionIndex)}
                      className="p-1.5 rounded-lg hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      style={{ color: "var(--muted)" }}
                      title="Delete this question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* CURRENT ACTIVE QUESTION CARD */}
                {currentQ && (
                  <div
                    className="p-4 rounded-2xl border space-y-4 shadow-sm flex-1"
                    style={{
                      background: "var(--card2)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {/* Question Statement */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label
                          className="text-xs font-bold flex items-center gap-1.5"
                          style={{ color: "var(--text)" }}
                        >
                          <HelpCircle className="w-4 h-4" style={{ color: "var(--accent)" }} />
                          Question #{activeQuestionIndex + 1}
                        </Label>
                        <span className="text-[10px]" style={{ color: "var(--subtle)" }}>
                          {currentQ.text.length} / 500 chars
                        </span>
                      </div>
                      <Input
                        value={currentQ.text}
                        onChange={(e) => updateQuestionText(e.target.value)}
                        placeholder="Type question statement here..."
                        className="font-medium text-sm rounded-xl h-10"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }}
                      />
                    </div>

                    {/* Meta: Time Limit & Points */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label
                          className="text-[11px] font-bold flex items-center gap-1 mb-1"
                          style={{ color: "var(--muted)" }}
                        >
                          <Clock className="w-3.5 h-3.5" style={{ color: "var(--subtle)" }} /> Time Limit
                        </Label>
                        <select
                          value={currentQ.time_limit}
                          onChange={(e) => updateQuestionTimeLimit(Number(e.target.value))}
                          className={`w-full h-9 px-3 rounded-xl border text-xs font-semibold outline-none focus:ring-2 ${activeAccent.ring}`}
                          style={{
                            background: "var(--input)",
                            borderColor: "var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          {TIME_LIMIT_OPTIONS.map((sec) => (
                            <option key={sec} value={sec}>
                              {sec} seconds
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label
                          className="text-[11px] font-bold flex items-center gap-1 mb-1"
                          style={{ color: "var(--muted)" }}
                        >
                          <Trophy className="w-3.5 h-3.5" style={{ color: "var(--subtle)" }} /> Points
                        </Label>
                        <select
                          value={currentQ.points}
                          onChange={(e) => updateQuestionPoints(Number(e.target.value))}
                          className={`w-full h-9 px-3 rounded-xl border text-xs font-semibold outline-none focus:ring-2 ${activeAccent.ring}`}
                          style={{
                            background: "var(--input)",
                            borderColor: "var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          {POINTS_OPTIONS.map((pts) => (
                            <option key={pts} value={pts}>
                              {pts} pts
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 4 Options Grid */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <Label
                          className="text-[11px] font-extrabold uppercase tracking-wider"
                          style={{ color: "var(--muted)" }}
                        >
                          Options &amp; Correct Answer
                        </Label>
                        <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                          Click radio or badge to mark correct
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentQ.options.map((opt, optIdx) => {
                          const letters = ["A", "B", "C", "D"];
                          const letterColors = [
                            "bg-red-500 text-white",
                            "bg-blue-500 text-white",
                            "bg-amber-500 text-white",
                            "bg-emerald-500 text-white",
                          ];

                          return (
                            <div
                              key={optIdx}
                              className="p-3 rounded-xl border-2 transition-all flex flex-col justify-between gap-2 cursor-pointer"
                              style={{
                                background: opt.is_correct
                                  ? "color-mix(in oklab, var(--accent) 10%, var(--card))"
                                  : "var(--card)",
                                borderColor: opt.is_correct ? "var(--accent)" : "var(--border)",
                              }}
                              onClick={() => setCorrectOption(optIdx)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-5 h-5 rounded-md text-[10px] font-extrabold flex items-center justify-center ${letterColors[optIdx]}`}
                                  >
                                    {letters[optIdx]}
                                  </span>
                                  <span className="text-[11px] font-bold" style={{ color: "var(--muted)" }}>
                                    Option {optIdx + 1}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCorrectOption(optIdx);
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${opt.is_correct ? "text-white shadow-xs" : "border"
                                    }`}
                                  style={
                                    opt.is_correct
                                      ? { background: "var(--accent)" }
                                      : {
                                        background: "var(--card2)",
                                        borderColor: "var(--border)",
                                        color: "var(--muted)",
                                      }
                                  }
                                >
                                  {opt.is_correct ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Correct</span>
                                    </>
                                  ) : (
                                    <span>Set Correct</span>
                                  )}
                                </button>
                              </div>

                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => updateOptionText(optIdx, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder={`Type option ${letters[optIdx]}...`}
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-none focus:ring-2 ${activeAccent.ring}`}
                                style={{
                                  background: "var(--input)",
                                  borderColor: "var(--border)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navigation between questions */}
                    <div
                      className="flex items-center justify-between pt-2 border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={activeQuestionIndex === 0}
                        onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                        className="text-xs font-bold gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={activeQuestionIndex >= questions.length - 1}
                        onClick={() =>
                          setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                        }
                        className="text-xs font-bold gap-1 cursor-pointer"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2 text-xs justify-center sm:justify-start" style={{ color: "var(--muted)" }}>
            <span className="font-bold" style={{ color: "var(--text)" }}>
              {questions.length} Question{questions.length === 1 ? "" : "s"}
            </span>
            <span>•</span>
            <span className="font-semibold" style={{ color: "var(--accent)" }}>
              Ready to publish as live activity
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-initial rounded-xl text-xs font-bold cursor-pointer"
              style={{
                background: "var(--card2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSaveQuiz}
              disabled={isSaving || !quizTitle.trim() || questions.length === 0}
              className="flex-1 sm:flex-initial rounded-xl text-white text-xs font-bold px-4 sm:px-5 flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-95 cursor-pointer border-0"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                boxShadow: "0 8px 20px -6px color-mix(in oklab, var(--accent) 55%, transparent)",
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Add AI Activity</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
