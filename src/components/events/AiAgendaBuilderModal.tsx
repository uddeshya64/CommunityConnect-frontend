"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Mic,
  MicOff,
  Wand2,
  Plus,
  Trash2,
  Clock,
  Calendar,
  MapPin,
  User,
  Tag,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Bot,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/providers/ToastProvider";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { AI_SPEECH_LANG } from "@/config/env";
import { eventService } from "@/services/event.service";
import { aiEventService } from "@/services/aiEvent.service";

export interface GeneratedSessionDraft {
  id: string;
  prompt?: string;
  title: string;
  speaker_name: string;
  start_time: string; // YYYY-MM-DDTHH:mm or "" if blank
  end_time: string; // YYYY-MM-DDTHH:mm or "" if blank
  location: string;
  tags: string[];
  description: string;
}

interface AiAgendaBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number | string;
  eventTitle: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
  isDark?: boolean;
  onSessionsCreated: (createdSessions: any[]) => void;
}

const SAMPLE_AGENDA_PROMPTS = [
  "🎉 Welcome Gala & Cake Cutting from 6:00 PM to 7:00 PM with games and celebratory music",
  "🏆 Grand Excellence Awards Ceremony from 7:30 PM to 8:30 PM hosted by Director Mehta",
  "🍕 Networking Dinner Party from 8:30 PM to 10:00 PM with live acoustic music",
  "🎙️ Opening Keynote: Future of AI & Cloud from 10:00 AM to 11:30 AM by Dr. Sarah Smith",
  "⚡ Hands-on Coding Lab on Modern Fullstack from 2:00 PM to 4:00 PM in Room 204",
];

function isoToLocalDateTimeInput(val?: string | null): string {
  if (!val || val === "null" || val === "undefined") return "";
  const trimmed = val.trim();
  if (!trimmed) return "";
  const localMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (localMatch && !trimmed.endsWith("Z") && !trimmed.includes("+")) {
    return `${localMatch[1]}T${localMatch[2]}`;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

export default function AiAgendaBuilderModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  eventStartDate,
  eventEndDate,
  eventLocation,
  isDark = false,
  onSessionsCreated,
}: AiAgendaBuilderModalProps) {
  const { success: showSuccess, error: showError } = useToast();

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GeneratedSessionDraft[]>([]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseInputRef = useRef("");
  const finalSpeechRef = useRef("");
  const interimSpeechRef = useRef("");

  const handleClose = () => {
    stopListening();
    setSessions([]);
    setPrompt("");
    setAiReply(null);
    setSelectedSessionIndex(0);
    onClose();
  };

  // Initialize with 1 blank draft when modal opens
  useEffect(() => {
    if (isOpen) {
      setSpeechError("");
      setInterimTranscript("");
      if (sessions.length === 0) {
        setSessions([
          {
            id: `draft_${Date.now()}_0`,
            prompt: "",
            title: "",
            speaker_name: "",
            start_time: "",
            end_time: "",
            location: "",
            tags: [],
            description: "",
          },
        ]);
        setSelectedSessionIndex(0);
        setPrompt("");
        setAiReply(null);
      }
    } else {
      stopListening();
    }
  }, [isOpen]);

  /* ------------------------- Web Speech API Recording ------------------------- */

  const finalizeVoiceInput = useCallback(() => {
    const base = baseInputRef.current.trim();
    const finalSpoken = [finalSpeechRef.current, interimSpeechRef.current]
      .filter(Boolean)
      .join(" ")
      .trim();
    const full = base ? (finalSpoken ? `${base} ${finalSpoken}` : base) : finalSpoken;
    if (full) {
      setPrompt(full);
      setSessions((prev) =>
        prev.map((s, idx) => (idx === selectedSessionIndex ? { ...s, prompt: full } : s))
      );
    }
    setInterimTranscript("");
    setIsListening(false);
    finalSpeechRef.current = "";
    interimSpeechRef.current = "";
  }, [selectedSessionIndex]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    finalizeVoiceInput();
  }, [finalizeVoiceInput]);

  const startListening = async () => {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setSpeechError("Voice input is not supported in this browser. Please type your prompt.");
      showError("Voice recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    setSpeechError("");

    // Verify mic access & release audio hardware track to prevent Chromium lock
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setSpeechError("Microphone permission denied. Please allow microphone access.");
        } else {
          setSpeechError("Could not access microphone. Please type your prompt.");
        }
        return;
      }
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    baseInputRef.current = prompt;
    finalSpeechRef.current = "";
    interimSpeechRef.current = "";

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = AI_SPEECH_LANG || "en-IN";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechEvent) => {
        setSpeechError("");
        let sessionFinal = "";
        let sessionInterim = "";

        for (let i = 0; i < event.results.length; i += 1) {
          const res = event.results[i];
          const text = res?.[0]?.transcript || "";
          if (res?.isFinal) {
            sessionFinal += (sessionFinal ? " " : "") + text.trim();
          } else {
            sessionInterim += (sessionInterim ? " " : "") + text.trim();
          }
        }

        finalSpeechRef.current = sessionFinal;
        interimSpeechRef.current = sessionInterim;
        setInterimTranscript(sessionInterim);

        const base = baseInputRef.current.trim();
        const liveFull = [base, sessionFinal, sessionInterim].filter(Boolean).join(" ");
        setPrompt(liveFull);
        setSessions((prev) =>
          prev.map((s, idx) => (idx === selectedSessionIndex ? { ...s, prompt: liveFull } : s))
        );
      };

      recognition.onerror = (event: { error?: string }) => {
        if (event?.error !== "no-speech") {
          setSpeechError(`Speech error: ${event?.error || "unknown"}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        finalizeVoiceInput();
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error("SpeechRecognition start error:", err);
      setSpeechError("Could not start voice recognition.");
      setIsListening(false);
    }
  };

  /* ------------------------- AI Generation Handler ------------------------- */

  const handleSelectSession = (idx: number) => {
    // Save current prompt into current session draft
    setSessions((prev) =>
      prev.map((s, i) => (i === selectedSessionIndex ? { ...s, prompt } : s))
    );
    setSelectedSessionIndex(idx);
    const targetPrompt = sessions[idx]?.prompt || "";
    setPrompt(targetPrompt);
    setAiReply(null);
  };

  const handleGenerateAgenda = async (customPrompt?: string) => {
    const textToRun = (customPrompt || prompt).trim();
    if (!textToRun) {
      showError("Please enter or record a prompt for this session draft.");
      return;
    }

    if (isListening) {
      stopListening();
    }

    try {
      setIsGenerating(true);
      setAiReply(null);

      const result = await aiEventService.generateAgenda({
        eventId,
        prompt: textToRun,
      });

      setAiReply(result.reply);

      const gen = result.sessions && result.sessions.length > 0 ? result.sessions[0] : null;

      if (gen) {
        const currentDraft = sessions[selectedSessionIndex];
        const updatedDraft: GeneratedSessionDraft = {
          id: currentDraft?.id || `draft_${Date.now()}`,
          prompt: textToRun, // PERSISTS PROMPT FOR THIS DRAFT
          title: gen.title || "",
          speaker_name: gen.speaker_name || "",
          start_time: isoToLocalDateTimeInput(gen.start_time),
          end_time: isoToLocalDateTimeInput(gen.end_time),
          location: gen.location || "",
          tags: gen.tags && gen.tags.length > 0 ? gen.tags : currentDraft?.tags || [],
          description: gen.description || "",
        };

        setSessions((prev) => {
          if (prev.length === 0) return [updatedDraft];
          return prev.map((item, idx) => (idx === selectedSessionIndex ? updatedDraft : item));
        });

        // Keep prompt in textarea so user can see it and edit it
        setPrompt(textToRun);

        showSuccess(`Draft ${selectedSessionIndex + 1} updated with AI details!`);
      } else {
        showError("No session details could be generated. Please try a more descriptive prompt.");
      }
    } catch (err: any) {
      console.error("AI Agenda generation error:", err);
      showError(err?.response?.data?.error || err?.message || "Failed to generate agenda session.");
    } finally {
      setIsGenerating(false);
    }
  };

  /* ------------------------- Session Form Mutators ------------------------- */

  const updateCurrentSession = (field: keyof GeneratedSessionDraft, value: any) => {
    setSessions((prev) =>
      prev.map((s, idx) => (idx === selectedSessionIndex ? { ...s, [field]: value } : s))
    );
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^,|,$/g, "");
      if (!trimmed) return;
      const current = sessions[selectedSessionIndex];
      if (current && !current.tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
        updateCurrentSession("tags", [...current.tags, trimmed]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const current = sessions[selectedSessionIndex];
    if (!current) return;
    updateCurrentSession(
      "tags",
      current.tags.filter((t) => t !== tagToRemove)
    );
  };

  const handleAddNewBlankSession = () => {
    setSessions((prev) =>
      prev.map((s, i) => (i === selectedSessionIndex ? { ...s, prompt } : s))
    );
    const newIdx = sessions.length;
    const newSession: GeneratedSessionDraft = {
      id: `draft_${Date.now()}_${newIdx}`,
      prompt: "",
      title: "",
      speaker_name: "",
      start_time: "",
      end_time: "",
      location: "",
      tags: [],
      description: "",
    };
    setSessions((prev) => [...prev, newSession]);
    setSelectedSessionIndex(newIdx);
    setPrompt("");
    setAiReply(null);
    showSuccess(`Added Draft ${newIdx + 1}. You can now enter a new prompt for this session!`);
  };

  const handleDeleteSession = (indexToDelete: number) => {
    if (sessions.length <= 1) {
      showError("You must keep at least one session in the agenda draft.");
      return;
    }
    setSessions((prev) => prev.filter((_, idx) => idx !== indexToDelete));
    setSelectedSessionIndex((prev) => Math.max(0, Math.min(prev, sessions.length - 2)));
  };

  /* ------------------------- Save to Event Agenda ------------------------- */

  const handleSaveAllToAgenda = async () => {
    if (sessions.length === 0) {
      showError("No sessions to save.");
      return;
    }

    // Validate sessions
    for (let i = 0; i < sessions.length; i += 1) {
      const s = sessions[i];
      if (!s.title.trim()) {
        showError(`Session #${i + 1} must have a title.`);
        setSelectedSessionIndex(i);
        return;
      }
      if (!s.start_time) {
        showError(`Session "${s.title}" is missing start time. Please select start time.`);
        setSelectedSessionIndex(i);
        return;
      }
      if (s.end_time && new Date(s.start_time) >= new Date(s.end_time)) {
        showError(`In session "${s.title}", end time must be after start time.`);
        setSelectedSessionIndex(i);
        return;
      }
    }

    try {
      setIsSaving(true);
      const createdList: any[] = [];

      for (const s of sessions) {
        const payload = {
          title: s.title.trim(),
          speaker_name: s.speaker_name?.trim() || null,
          description: s.description?.trim() || null,
          location: s.location?.trim() || null,
          tags: s.tags || [],
          start_time: new Date(s.start_time).toISOString(),
          end_time: s.end_time ? new Date(s.end_time).toISOString() : null,
          should_notify: true,
        };

        const res = await eventService.createTimeline(String(eventId), payload);
        const newItem = res.data?.data || res.data || res;
        createdList.push(newItem);
      }

      showSuccess(`Added ${createdList.length} session(s) to event agenda!`);
      onSessionsCreated(createdList);
      handleClose();
    } catch (err: any) {
      console.error("Save agenda error:", err);
      showError(err?.response?.data?.error || err?.message || "Failed to save sessions to agenda.");
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentSession = sessions[selectedSessionIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
          className={`w-full max-w-5xl rounded-[2.5rem] border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative ${
            isDark ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-inherit shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">AI Agenda Builder</h3>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Voice & Text AI
                  </span>
                </div>
                <p className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Build and review sessions for <span className="font-bold">{eventTitle}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              type="button"
              className={`p-2 rounded-full transition-colors ${
                isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-900" : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content Area: Split View */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-inherit">
            
            {/* LEFT / TOP COLUMN: Prompt & Voice Input (5 cols) */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 overflow-y-auto bg-inherit">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5" /> Prompt / Speak
                    </Label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      Draft {selectedSessionIndex + 1}
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    AI-powered
                  </span>
                </div>

                {/* Voice / Text Prompt Box */}
                <div className="relative rounded-2xl border-2 transition-all border-zinc-700 focus-within:border-indigo-500 bg-zinc-900/60 p-3">
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setSessions((prev) =>
                        prev.map((s, idx) =>
                          idx === selectedSessionIndex ? { ...s, prompt: e.target.value } : s
                        )
                      );
                    }}
                    placeholder="Describe this session (e.g. 🎉 Grand celebration kickoff with cake cutting from 6 PM to 7 PM, or tech keynote from 10 to 11:30 AM)..."
                    rows={4}
                    className="w-full bg-transparent text-sm font-medium resize-none focus:outline-none placeholder:text-zinc-500 leading-relaxed text-white"
                  />

                  {/* Speech interim waveform / status */}
                  {isListening && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mt-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>Listening... speak your schedule details</span>
                    </div>
                  )}

                  {speechError && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{speechError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800 mt-2">
                    {/* Voice Microphone Toggle */}
                    <Button
                      type="button"
                      onClick={startListening}
                      className={`rounded-xl px-4 py-2 font-bold text-xs flex items-center gap-2 transition-all ${
                        isListening
                          ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-lg shadow-red-600/30"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 text-white" /> Stop Mic
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 text-indigo-400" /> Record Voice
                        </>
                      )}
                    </Button>

                    {/* Generate Button */}
                    <Button
                      type="button"
                      onClick={() => handleGenerateAgenda()}
                      disabled={isGenerating || !prompt.trim()}
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs px-5 py-2 shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Structuring Draft {selectedSessionIndex + 1}...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Generate Draft {selectedSessionIndex + 1}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* AI Assistant Explanation Bubble */}
                {aiReply && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs font-medium flex items-start gap-3"
                  >
                    <Bot className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{aiReply}</p>
                  </motion.div>
                )}

                {/* Sample Prompt Suggestions */}
                <div className="space-y-2 pt-2">
                  <p className={`text-[11px] font-black uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    Suggested Prompts
                  </p>
                  <div className="flex flex-col gap-2">
                    {SAMPLE_AGENDA_PROMPTS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPrompt(p);
                          handleGenerateAgenda(p);
                        }}
                        className={`text-left text-xs p-3 rounded-xl border transition-all text-zinc-300 hover:text-white ${
                          isDark ? "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900" : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <span className="text-indigo-400 font-bold mr-1.5">✦</span>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Interactive Review & Edit Form (7 cols) */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6 overflow-y-auto">
              {sessions.length === 0 ? (
                /* Empty state before generation */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[350px]">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 opacity-80" />
                  </div>
                  <h4 className="text-lg font-extrabold tracking-tight">No Agenda Sessions Yet</h4>
                  <p className={`text-xs font-medium max-w-sm mt-1.5 leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Speak or type your agenda prompt on the left. The AI will extract the sessions, align dates, and let you review and edit every detail before saving!
                  </p>
                </div>
              ) : (
                /* Active Session Review & Editing Form */
                <div className="space-y-6">
                  {/* Session Selector Tabs */}
                  <div className="flex items-center justify-between pb-3 border-b border-inherit">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[80%]">
                      {sessions.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectSession(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all flex items-center gap-1.5 ${
                            selectedSessionIndex === idx
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                              : isDark
                              ? "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                              : "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200"
                          }`}
                        >
                          <span className="truncate max-w-[140px]">{s.title ? s.title : `Session ${idx + 1}`}</span>
                          {selectedSessionIndex === idx && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}

                      <Button
                        type="button"
                        onClick={handleAddNewBlankSession}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-xs font-bold text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Draft
                      </Button>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleDeleteSession(selectedSessionIndex)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>

                  {/* Edit Form for the Current Selected Session */}
                  {currentSession && (
                    <div className="space-y-4">
                      {/* Session Title */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Session Title *
                        </Label>
                        <Input
                          value={currentSession.title || ""}
                          onChange={(e) => updateCurrentSession("title", e.target.value)}
                          placeholder="e.g. Opening Keynote: Generative AI in Production"
                          maxLength={100}
                          className="py-5 rounded-xl bg-zinc-900/60 border-zinc-700 font-bold text-sm text-white"
                        />
                      </div>

                      {/* Speaker & Location in 2 cols */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-400" /> Speaker / Host
                          </Label>
                          <Input
                            value={currentSession.speaker_name || ""}
                            onChange={(e) => updateCurrentSession("speaker_name", e.target.value)}
                            placeholder="e.g. Dr. Sarah Smith"
                            maxLength={100}
                            className="py-5 rounded-xl bg-zinc-900/60 border-zinc-700 font-semibold text-sm text-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Room / Stage / Link
                          </Label>
                          <Input
                            value={currentSession.location || ""}
                            onChange={(e) => updateCurrentSession("location", e.target.value)}
                            placeholder="e.g. Auditorium A or Virtual Stage"
                            maxLength={100}
                            className="py-5 rounded-xl bg-zinc-900/60 border-zinc-700 font-semibold text-sm text-white"
                          />
                        </div>
                      </div>

                      {/* Timestamps in 2 cols */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" /> Start Time *
                          </Label>
                          <Input
                            type="datetime-local"
                            value={currentSession.start_time || ""}
                            onChange={(e) => updateCurrentSession("start_time", e.target.value)}
                            className="py-5 rounded-xl bg-zinc-900/60 border-zinc-700 font-semibold text-sm text-white [color-scheme:dark]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-rose-400" /> End Time *
                          </Label>
                          <Input
                            type="datetime-local"
                            value={currentSession.end_time || ""}
                            onChange={(e) => updateCurrentSession("end_time", e.target.value)}
                            className="py-5 rounded-xl bg-zinc-900/60 border-zinc-700 font-semibold text-sm text-white [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* Tags Chip Editor */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-amber-400" /> Session Tags
                        </Label>
                        <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-700 flex flex-wrap items-center gap-2">
                          {currentSession.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center gap-1.5"
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="text-indigo-400 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            placeholder="Add tag and press Enter..."
                            className="bg-transparent text-xs font-semibold text-white focus:outline-none placeholder:text-zinc-500 flex-1 min-w-[140px]"
                          />
                        </div>
                      </div>

                      {/* Session Description */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Session Overview & Takeaways
                        </Label>
                        <RichTextEditor
                          value={currentSession.description}
                          onChange={(val) => updateCurrentSession("description", val)}
                          placeholder="Key topics covered, format, prerequisites, or session takeaways..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-inherit bg-inherit shrink-0">
            <div className="text-xs font-semibold text-zinc-400">
              {sessions.length > 0 ? (
                <span>
                  <strong className="text-white">{sessions.length}</strong> session(s) ready to add to event
                </span>
              ) : (
                <span>Prompt or record above to start</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                className="rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-bold px-5"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSaveAllToAgenda}
                disabled={isSaving || sessions.length === 0}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-6 py-2.5 shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Sessions...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Add to Event Agenda
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
