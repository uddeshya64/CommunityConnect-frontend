"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Mic,
  MicOff,
  Loader2,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MapPin,
  Clock,
  Users,
  Ticket,
  ListPlus,
  AlignLeft,
  Globe,
  RotateCcw,
  Bot,
  User,
  Info,
  Crosshair,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppLayout from "@/components/layout/AppLayout";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { PREDEFINED_EVENT_CATEGORIES } from "@/lib/eventTemplates";
import { eventService } from "@/services/event.service";
import {
  locationService,
  type LocationSuggestion,
} from "@/services/location.service";
import {
  aiEventService,
  type AiEventDraft,
  type AiConversationMessage,
} from "@/services/aiEvent.service";

const MODES = ["online", "offline", "hybrid"];
const REG_TYPES = ["solo", "team"];

const SAMPLE_PROMPTS = [
  "Create a two-day technical conference on AI and cloud computing at our Jaipur office on November 15, 2026 for 100 participants, with a registration deadline five days before the event.",
  "Plan a Salesforce Flow workshop next month, online, for 40 people.",
  "Organize a weekend hackathon in Jaipur for 150 participants focused on web development, with team registration.",
];

const DEFAULT_SPEECH_LANG = process.env.NEXT_PUBLIC_AI_SPEECH_LANG || "en-IN";

function isoToLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function formatDisplayDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: {
      data?: {
        error?: unknown;
        message?: string;
        issues?: Array<{ message?: string }>;
        data?: { errors?: Record<string, string[]> };
      };
    };
    message?: string;
  };
  const resData = err?.response?.data;
  if (resData?.error) {
    const detail = resData.error;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === "string"
            ? item
            : (item as { message?: string })?.message || JSON.stringify(item)
        )
        .join(" ");
    }
    if (typeof detail === "string") return detail;
  }
  if (Array.isArray(resData?.issues) && resData.issues.length > 0) {
    return resData.issues.map((i) => i.message || "").filter(Boolean).join(" ");
  }
  if (resData?.data?.errors) {
    const messages = Object.values(resData.data.errors).flat();
    if (messages.length > 0) return messages.join(" ");
  }
  if (resData?.message) return resData.message;
  return err?.message || fallback;
}

function generateClientDescription(d: AiEventDraft, userPrompt?: string): string {
  const title = (d.title || "Special Community Event").toString().trim();
  const category = (d.type || "").toString().trim();
  const mode = (d.mode || "offline").toLowerCase();
  const location = (d.location || "").toString().trim();
  const prompt = (userPrompt || "").toLowerCase();

  const venueInfo =
    mode === "online"
      ? "hosted live online with interactive sessions"
      : location
      ? `taking place in person at ${location}`
      : "taking place in person at our designated venue";

  const lowerCat = category.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (
    lowerCat.includes("hackathon") ||
    lowerTitle.includes("hackathon") ||
    prompt.includes("hackathon") ||
    prompt.includes("coding") ||
    prompt.includes("codeathon")
  ) {
    return `Get ready for ${title}! Join passionate developers, designers, and innovators for an intensive, high-energy building sprint. Participants will collaborate in teams to brainstorm groundbreaking ideas, build functional prototypes, and pitch impactful solutions. Whether you are an experienced hacker or developing your very first product, you will find hands-on mentorship, peer learning, and exciting opportunities for awards and recognition.`;
  }

  if (
    lowerCat.includes("conference") ||
    lowerTitle.includes("conference") ||
    lowerTitle.includes("summit") ||
    prompt.includes("conference") ||
    prompt.includes("summit") ||
    prompt.includes("symposium")
  ) {
    return `Welcome to ${title}, a premier gathering ${venueInfo} designed to unite industry professionals, creators, and technology leaders. Immerse yourself in insightful keynote discussions, forward-looking deep dives, and meaningful peer networking. Attendees will gain actionable insights, innovative perspectives, and valuable connections to accelerate their journey.`;
  }

  if (
    lowerCat.includes("training") ||
    lowerCat.includes("academic") ||
    lowerTitle.includes("workshop") ||
    prompt.includes("workshop") ||
    prompt.includes("training") ||
    prompt.includes("bootcamp") ||
    prompt.includes("masterclass")
  ) {
    return `Elevate your skillset with ${title}! This comprehensive, hands-on workshop is crafted to deliver practical understanding and direct application. Guided by experienced mentors, attendees will explore core principles, learn real-world techniques, and take part in interactive exercises designed to level up their capabilities.`;
  }

  if (lowerCat.includes("corporate") || lowerTitle.includes("corporate") || prompt.includes("corporate")) {
    return `Join us for ${title}, a curated gathering focused on strategic alignment, milestone achievements, and team collaboration. This session brings together stakeholders and team members to celebrate collective progress, exchange key insights, and set clear goals for upcoming ventures in an engaging atmosphere.`;
  }

  if (
    lowerCat.includes("community") ||
    lowerCat.includes("nonprofit") ||
    prompt.includes("charity") ||
    prompt.includes("volunteer") ||
    prompt.includes("donation") ||
    prompt.includes("ngo")
  ) {
    return `Be part of positive change with ${title}! A community-powered gathering bringing volunteers, partners, and supporters together to make a real difference. Connect with dedicated individuals, share impactful moments, and contribute directly towards building a stronger, more supportive community.`;
  }

  if (
    lowerCat.includes("sports") ||
    lowerCat.includes("recreational") ||
    prompt.includes("tournament") ||
    prompt.includes("match") ||
    prompt.includes("cricket") ||
    prompt.includes("football")
  ) {
    return `Experience the excitement of ${title}! An energetic sporting gathering celebrating teamwork, fitness, and friendly competition. Whether participating as a competitor or cheering from the sidelines, join us for a day of spirited challenges, athletic achievements, and memorable moments.`;
  }

  if (lowerCat.includes("exhibition") || lowerTitle.includes("expo") || prompt.includes("expo") || prompt.includes("trade show")) {
    return `Explore future opportunities at ${title}! A dynamic showcase ${venueInfo} featuring innovative exhibits, interactive demonstrations, and valuable networking with leading brands, creators, and industry pioneers. Discover the latest products and gain firsthand insights into cutting-edge trends.`;
  }

  if (lowerCat.includes("wedding") || lowerCat.includes("personal") || prompt.includes("party") || prompt.includes("celebration")) {
    return `Join us as we celebrate ${title}! A heartwarming occasion bringing friends, family, and loved ones together to celebrate shared joy, meaningful bonds, and unforgettable memories. Come celebrate this special milestone with warmth, festivities, and great company.`;
  }

  return `Welcome to ${title}, an exciting and engaging event ${venueInfo}! Designed to foster collaboration, learning, and memorable experiences, this gathering offers attendees curated sessions, thought-provoking discussions, and prime networking opportunities. Reserve your spot today to connect with peers and be part of an unforgettable experience.`;
}

export default function AiEventCreatorPage() {
  const router = useRouter();
  const { isDark, activeAccent } = useAppearance();
  const { success: showSuccess, error: showError } = useToast();

  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<AiEventDraft>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const typeOptions = PREDEFINED_EVENT_CATEGORIES;

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechLang, setSpeechLang] = useState<string>(DEFAULT_SPEECH_LANG);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseInputRef = useRef<string>("");
  const finalSpeechRef = useRef<string>("");
  const interimSpeechRef = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Accurate Location & Mapbox Suggestions state
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationAbortRef = useRef<AbortController | null>(null);

  const hasDraft = Object.keys(draft).length > 0;

  useEffect(() => {
    const hasRec = Boolean(getSpeechRecognition());
    setSpeechSupported(hasRec);
    if (typeof window !== "undefined" && navigator?.language) {
      const userLang = navigator.language;
      if (!process.env.NEXT_PUBLIC_AI_SPEECH_LANG) {
        if (userLang.startsWith("hi")) {
          setSpeechLang("hi-IN");
        } else if (userLang.startsWith("en-IN")) {
          setSpeechLang("en-IN");
        } else if (userLang.startsWith("en")) {
          setSpeechLang("en-US");
        }
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Debounced Location Autocomplete search via Mapbox API
  useEffect(() => {
    const loc = (draft.location || "").toString().trim();
    if (!loc || loc.length < 3 || draft.mode === "online") {
      setLocationSuggestions([]);
      setIsLoadingLocation(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      locationAbortRef.current?.abort();
      const controller = new AbortController();
      locationAbortRef.current = controller;
      setIsLoadingLocation(true);

      try {
        const results = await locationService.search(loc, controller.signal);
        setLocationSuggestions(results);
        if (results.length > 0) {
          setIsLocationDropdownOpen(true);
        }
      } catch {
        setLocationSuggestions([]);
      } finally {
        if (locationAbortRef.current === controller) {
          setIsLoadingLocation(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [draft.location, draft.mode]);

  const handleDetectLocation = async () => {
    if (isDetectingLocation) return;
    setIsDetectingLocation(true);
    try {
      const address = await locationService.detectCurrentLocation();
      updateDraft("location", address);
      setLocationSuggestions([]);
      setIsLocationDropdownOpen(false);
      showSuccess(`Accurate location detected: ${address.split(",")[0]}`);
    } catch (err: any) {
      showError(err?.message || "Could not detect location. Please check browser GPS permissions.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSelectLocation = (s: LocationSuggestion) => {
    const label = [s.name, s.address].filter(Boolean).join(" - ") || s.name || s.address;
    updateDraft("location", label);
    setLocationSuggestions([]);
    setIsLocationDropdownOpen(false);
  };

  const handleReset = () => {
    recognitionRef.current?.abort();
    setIsListening(false);
    setInterimTranscript("");
    setMessages([]);
    setDraft({});
    setErrors({});
    setMissingFields([]);
    setInput("");
    setLocationSuggestions([]);
    setIsLocationDropdownOpen(false);
  };

  const handleGenerate = async () => {
    // Stop microphone if currently listening to prevent prompt repetition
    if (isListening) {
      stopListening();
    }

    const message = input.trim();
    if (!message) {
      showError("Tell me about the event you want to create first.");
      return;
    }
    if (isGenerating) return;

    setIsGenerating(true);
    setSpeechError("");
    const userMessage: AiConversationMessage = { role: "user", content: message };

    try {
      const result = await aiEventService.chat({
        message,
        history: messages,
        draft,
        knownTypes: typeOptions,
      });

      const nextDraft = { ...(result.draft || {}) };
      if (!nextDraft.description || String(nextDraft.description).trim().length < 20) {
        nextDraft.description = generateClientDescription(nextDraft, message);
      }

      setMessages((prev) => [
        ...prev,
        userMessage,
        { role: "assistant", content: result.reply },
      ]);
      setDraft(nextDraft);
      setMissingFields(result.missing_fields?.filter((f) => f !== "description") || []);
      setInput("");
    } catch (err: unknown) {
      setMessages((prev) => [...prev, userMessage]);
      showError(extractErrorMessage(err, "AI could not process your request."));
    } finally {
      setIsGenerating(false);
      setInterimTranscript("");
    }
  };

  const handleAutoGenerateDescription = () => {
    const generated = generateClientDescription(draft, input);
    updateDraft("description", generated);
    showSuccess("AI evaluated and generated description!");
  };

  /* ------------------------- Voice input (Web Speech API) ------------------------- */

  const finalizeVoiceInput = useCallback(() => {
    const base = baseInputRef.current.trim();
    const finalSpoken = [finalSpeechRef.current, interimSpeechRef.current]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (finalSpoken) {
      setInput(base ? `${base} ${finalSpoken}` : finalSpoken);
    }
    setInterimTranscript("");
    setIsListening(false);
    finalSpeechRef.current = "";
    interimSpeechRef.current = "";
  }, []);

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
      setSpeechError("Voice input is not supported in this browser. Please type your event instead.");
      showError("Microphone input is not supported in this browser.");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    setSpeechError("");

    // 1. Verify mic access and immediately release the audio hardware track.
    // In Chromium, an active MediaStream holds the audio capture device,
    // which prevents SpeechRecognition from receiving audio frames.
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setSpeechError("Microphone permission was denied. Please allow microphone access in your browser address bar.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setSpeechError("No microphone was detected on this device. Please check your mic connection.");
        } else {
          setSpeechError("Could not access microphone. Please type your event instead.");
        }
        return;
      }
    }

    // 2. Abort previous recognition instance cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }

    // 3. Snapshot base input before this speech session
    baseInputRef.current = input;
    finalSpeechRef.current = "";
    interimSpeechRef.current = "";

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = speechLang;
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

        // Update textarea live with base input + finalized text + interim preview
        const base = baseInputRef.current.trim();
        const liveFull = [base, sessionFinal, sessionInterim].filter(Boolean).join(" ");
        setInput(liveFull);
      };

      recognition.onend = () => {
        finalizeVoiceInput();
      };

      recognition.onerror = (event: { error?: string }) => {
        const code = event?.error || "";
        const messages: Record<string, string> = {
          "not-allowed":
            "Microphone permission was denied. Allow microphone access in your browser and try again.",
          "service-not-allowed":
            "Microphone access was blocked in your browser settings.",
          "no-speech":
            "No speech was detected. Please check your microphone volume and speak clearly.",
          "network":
            "Speech recognition failed due to a network issue. If using Brave browser, enable Google Services in Settings > Privacy, or type your event.",
          "audio-capture":
            "No microphone was found or it is being used by another application.",
          "aborted": "",
        };
        if (code && code !== "aborted") {
          setSpeechError(messages[code] || "Speech recognition failed. Please try again or type your event.");
          setIsListening(false);
        }
      };

      recognition.start();
      setIsListening(true);
    } catch {
      setSpeechError("Could not start microphone. Please type your event instead.");
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  /* --------------------------------- Review form --------------------------------- */

  const updateDraft = (key: keyof AiEventDraft, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setMissingFields((prev) =>
      value === undefined || value === null || value === ""
        ? prev
        : prev.filter((f) => f !== key)
    );
  };

  const localValidation = (current: AiEventDraft): Record<string, string[]> => {
    const next: Record<string, string[]> = {};
    const title = (current.title || "").toString().trim();
    const desc = (current.description || "").toString().trim();

    if (!title) next.title = ["Title is required."];
    else if (title.length < 5) next.title = ["Title must be at least 5 characters."];

    if (!desc) next.description = ["Description is required."];
    else if (desc.length < 20) next.description = ["Description must be at least 20 characters."];

    if (!current.type) next.type = ["Category is required."];

    if (!current.mode) next.mode = ["Mode is required."];

    const start = current.start_date ? new Date(current.start_date) : null;
    const end = current.end_date ? new Date(current.end_date) : null;

    if (!start || Number.isNaN(start.getTime())) {
      next.start_date = ["Start date is required."];
    } else if (start < new Date(Date.now() - 10 * 60 * 1000)) {
      next.start_date = ["Start date cannot be in the past."];
    }

    if (!end || Number.isNaN(end.getTime())) {
      next.end_date = ["End date is required."];
    } else if (start && end && end <= start) {
      next.end_date = ["End date must be after start date."];
    }

    const mode = current.mode || "offline";
    if (mode !== "online" && !(current.location || "").toString().trim()) {
      next.location = ["Location is required for offline/hybrid events."];
    }

    const cap = Number(current.capacity);
    if (current.capacity !== undefined && current.capacity !== "" && (Number.isNaN(cap) || cap < 0)) {
      next.capacity = ["Capacity must be a positive number."];
    }

    const fee = Number(current.registration_fee ?? 0);
    if (Number.isNaN(fee) || fee < 0) {
      next.registration_fee = ["Registration fee must be ₹0 or higher."];
    }

    if (!current.registration_type) {
      next.registration_type = ["Registration type is required."];
    }

    const min = Number(current.min_team_size ?? 1);
    const max = Number(current.max_team_size ?? 1);
    if (Number.isNaN(min) || min < 1) next.min_team_size = ["Minimum team size must be at least 1."];
    if (Number.isNaN(max) || max < 1) next.max_team_size = ["Maximum team size must be at least 1."];
    if (!Number.isNaN(min) && !Number.isNaN(max) && max < min) {
      next.max_team_size = ["Maximum team size cannot be less than minimum team size."];
    }

    return next;
  };

  const handleValidate = async (): Promise<{ valid: boolean; event: AiEventDraft }> => {
    const local = localValidation(draft);
    setErrors({});
    setMissingFields([]);

    if (Object.keys(local).length > 0) {
      setErrors(local);
      const missing = Object.keys(local);
      setMissingFields(missing);
      showError("Please complete all required fields highlighted below.");
      return { valid: false, event: draft };
    }

    setIsValidating(true);
    try {
      const result = await aiEventService.validate(draft);
      if (result) {
        setErrors(result.errors || {});
        setMissingFields(result.missing_fields || []);
        if (!result.valid) {
          showError("Some details are missing or invalid. Please review the highlighted fields.");
        }
        return { valid: result.valid, event: result.event || draft };
      }
      return { valid: true, event: draft };
    } catch (err: unknown) {
      showError(extractErrorMessage(err, "Validation failed."));
      return { valid: false, event: draft };
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreate = async () => {
    if (isCreating) return;

    const { valid, event } = await handleValidate();
    if (!valid || !event) return;

    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        title: (event.title || draft.title || "").toString().trim(),
        description: (event.description || draft.description || "").toString().trim(),
        type: event.type || draft.type,
        mode: event.mode || draft.mode || "offline",
        location: (event.location || draft.location || (draft.mode === "online" ? "Online" : "")).toString().trim() || undefined,
        start_date: new Date(event.start_date || draft.start_date!).toISOString(),
        end_date: new Date(event.end_date || draft.end_date!).toISOString(),
        capacity: Number(event.capacity ?? draft.capacity) || 0,
        registration_type: event.registration_type || draft.registration_type || "solo",
        registration_fee: Number(event.registration_fee ?? draft.registration_fee) || 0,
        min_team_size: Number(event.min_team_size ?? draft.min_team_size) || 1,
        max_team_size: Number(event.max_team_size ?? draft.max_team_size) || 1,
      };

      if (draft.banner_url && typeof draft.banner_url === "string" && draft.banner_url.trim()) {
        payload.banner_url = draft.banner_url.trim();
      }
      if (draft.logo_url && typeof draft.logo_url === "string" && draft.logo_url.trim()) {
        payload.logo_url = draft.logo_url.trim();
      }
      if (draft.custom_fields) {
        payload.custom_fields = draft.custom_fields;
      }

      const created = await eventService.createEvent(payload);
      showSuccess("Event created successfully!");
      const id = created?.data?.id ?? created?.data?.eventId ?? created?.id;
      router.push(id ? `/events/${id}` : "/home");
    } catch (err: unknown) {
      setIsCreating(false);
      showError(extractErrorMessage(err, "Failed to create event."));
    }
  };

  const isLocationRequired = (draft.mode || "offline") !== "online";

  const fieldClass = (key: string) =>
    `${
      errors[key]?.length
        ? "border-red-400 focus-visible:ring-red-400"
        : missingFields.includes(key)
        ? "border-amber-400 focus-visible:ring-amber-400"
        : ""
    }`;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"}`}>
      <AppLayout>
        <main className="flex-1 relative overflow-hidden pb-20 min-w-0">
          <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 relative z-10">
            {/* Header */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/events/create">
                  <Button
                    variant="ghost"
                    className={`rounded-xl font-bold ${isDark ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeAccent.bg} text-white shadow-lg`}>
                      <Wand2 className="w-5 h-5" />
                    </span>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        AI Event Creator
                      </h1>
                      <p className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        Describe your event — type it or speak it. Review, edit and publish.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleReset}
                className="rounded-2xl font-bold"
                title="Start over"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              {/* ------------------------------- LEFT: Chat ------------------------------- */}
              <section className="lg:col-span-2 space-y-4">
                <div className={`rounded-3xl border shadow-sm overflow-hidden flex flex-col ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"}`}>
                  <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Bot className={`w-4 h-4 ${activeAccent.text}`} />
                      AI Assistant
                    </div>
                    {isGenerating && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                      </span>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 min-h-[260px] max-h-[420px] overflow-y-auto p-5 space-y-4">
                    {messages.length === 0 && !isGenerating ? (
                      <div className="text-center py-6">
                        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-indigo-50 text-indigo-500"}`}>
                          <Sparkles className="w-7 h-7" />
                        </div>
                        <p className={`text-sm font-bold mb-1 ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                          How should I create your event?
                        </p>
                        <p className={`text-xs font-medium mb-4 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          Describe the event in plain language or use one of these examples.
                        </p>
                        <div className="space-y-2 text-left">
                          {SAMPLE_PROMPTS.map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => {
                                if (isListening) stopListening();
                                setInput(prompt);
                                setInterimTranscript("");
                              }}
                              className={`w-full text-left text-xs font-semibold rounded-xl border px-3.5 py-2.5 transition-colors ${
                                isDark
                                  ? "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:border-indigo-500 hover:text-white"
                                  : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-indigo-400 hover:text-zinc-900"
                              }`}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((message, index) => (
                          <div key={index} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                            {message.role === "assistant" && (
                              <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${activeAccent.bg} text-white`}>
                                <Bot className="w-4 h-4" />
                              </span>
                            )}
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                                message.role === "user"
                                  ? isDark
                                    ? "bg-indigo-600 text-white"
                                    : "bg-indigo-600 text-white"
                                  : isDark
                                  ? "bg-zinc-800 text-zinc-200"
                                  : "bg-zinc-100 text-zinc-800"
                              }`}
                            >
                              {message.content}
                            </div>
                            {message.role === "user" && (
                              <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-600"}`}>
                                <User className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        ))}
                        {isGenerating && (
                          <div className="flex items-center gap-2.5">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${activeAccent.bg} text-white`}>
                              <Bot className="w-4 h-4" />
                            </span>
                            <span className={`h-8 flex items-center gap-1 px-3 rounded-2xl text-xs font-semibold ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500"}`}>
                              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}>
                                Generating your event draft…
                              </motion.span>
                            </span>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input */}
                  <div className={`border-t p-4 space-y-3 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        rows={3}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                            e.preventDefault();
                            handleGenerate();
                          }
                        }}
                        placeholder="Describe your event… (Ctrl + Enter to send)"
                        aria-label="Describe your event"
                        className={`w-full rounded-xl border px-3.5 py-3 text-sm resize-none focus:outline-none focus:ring-2 ${activeAccent.ring} ${
                          isDark
                            ? "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
                            : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                        }`}
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                        {speechSupported && !isListening && (
                          <select
                            value={speechLang}
                            onChange={(e) => setSpeechLang(e.target.value)}
                            aria-label="Speech recognition language"
                            title="Select speech recognition language"
                            className={`text-[11px] font-medium rounded-lg border px-1.5 py-1 transition focus:outline-none ${
                              isDark
                                ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white"
                                : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900"
                            }`}
                          >
                            <option value="en-IN">EN (India)</option>
                            <option value="en-US">EN (US)</option>
                            <option value="hi-IN">हिन्दी (Hindi)</option>
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={startListening}
                          disabled={!speechSupported}
                          aria-label={isListening ? "Stop recording" : "Start voice input"}
                          title={isListening ? "Stop recording" : "Speak your event"}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                            isListening
                              ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse"
                              : speechSupported
                              ? `${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white" : "bg-white border-zinc-200 text-zinc-500 hover:text-indigo-600"}`
                              : "opacity-40 cursor-not-allowed text-zinc-400 border-zinc-200"
                          }`}
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {isListening && (
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="relative flex w-2 h-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                          <span className="truncate">
                            Listening… {interimTranscript && <em className="opacity-80 not-italic font-normal">“{interimTranscript}”</em>}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={stopListening}
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 text-[11px] font-semibold transition shadow-sm"
                        >
                          Done speaking
                        </button>
                      </div>
                    )}

                    {speechError && (
                      <div className="flex items-start gap-2 text-xs font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{speechError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-[11px] font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                        {speechSupported ? "Mic uses your browser's speech recognition · Speak clearly." : "Voice input not supported — type instead."}
                      </p>
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !input.trim()}
                        className={`rounded-xl ${activeAccent.bg} hover:opacity-90 text-white font-bold shadow-lg ${activeAccent.shadow}`}
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate with AI
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Status card */}
                {hasDraft && (
                  <div className={`rounded-3xl border p-4 shadow-sm ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        Draft status
                      </h3>
                      <span className={`text-xs font-bold flex items-center gap-1 ${
                        missingFields.length === 0 ? "text-emerald-500" : "text-amber-500"
                      }`}>
                        {missingFields.length === 0 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                          </>
                        ) : (
                          <>
                            <Info className="w-3.5 h-3.5" /> {missingFields.length} missing
                          </>
                        )}
                      </span>
                    </div>
                    {missingFields.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {missingFields.map((key) => (
                          <span key={key} className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-500/10 border border-amber-500/30 text-amber-600">
                            {key.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {missingFields.length === 0 && (
                      <p className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        Everything looks ready. Review the details on the right, then hit Create Event.
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* ----------------------------- RIGHT: Preview ----------------------------- */}
              <section className="lg:col-span-3">
                <div className={`rounded-3xl border shadow-sm overflow-hidden ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"}`}>
                  <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <AlignLeft className={`w-4 h-4 ${activeAccent.text}`} />
                      Editable Event Preview
                    </div>
                    {hasDraft && (
                      <button
                        type="button"
                        onClick={handleValidate}
                        disabled={isValidating}
                        className={`text-xs font-bold rounded-lg px-3 py-1.5 border flex items-center gap-1.5 transition-colors ${
                          isDark
                            ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {isValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Validate
                      </button>
                    )}
                  </div>

                  {!hasDraft ? (
                    <div className="p-10 text-center">
                      <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center mb-4 ${isDark ? "bg-zinc-800" : "bg-indigo-50"}`}>
                        <Calendar className={`w-8 h-8 ${activeAccent.text}`} />
                      </div>
                      <h3 className={`font-extrabold text-lg mb-1 ${isDark ? "text-white" : "text-zinc-800"}`}>
                        Your AI-generated event will appear here
                      </h3>
                      <p className={`text-sm font-medium max-w-md mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        Tell the assistant what you&apos;re planning on the left. Every field below stays editable so you can correct anything before publishing.
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 md:p-8 space-y-6 max-h-[700px] overflow-y-auto">
                      {Object.keys(errors).length > 0 && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Please fix the highlighted fields below before creating the event.</span>
                        </div>
                      )}

                      {/* Title */}
                      <div className="space-y-1.5">
                        <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={draft.title || ""}
                          onChange={(e) => updateDraft("title", e.target.value)}
                          placeholder="Event title"
                          className={`py-6 text-base font-bold ${fieldClass("title")} ${isDark ? "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                        />
                        {errors.title && <FieldError message={errors.title[0]} />}
                      </div>

                      {/* Category + Mode */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            Category <span className="text-red-500">*</span>
                          </Label>
                          <select
                            value={draft.type || ""}
                            onChange={(e) => updateDraft("type", e.target.value)}
                            className={`h-11 w-full rounded-lg border px-3 text-sm font-semibold focus:outline-none focus:ring-2 ${activeAccent.ring} ${fieldClass("type")} ${
                              isDark ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                            }`}
                          >
                            <option value="" disabled>Select a category</option>
                            {typeOptions.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {errors.type && <FieldError message={errors.type[0]} />}
                        </div>

                        <div className="space-y-1.5">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            Mode <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex gap-2">
                            {MODES.map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updateDraft("mode", mode)}
                                className={`flex-1 h-11 rounded-lg border font-bold text-sm capitalize transition-all ${
                                  draft.mode === mode
                                    ? `${activeAccent.bg} text-white border-transparent shadow-sm`
                                    : isDark
                                    ? "bg-zinc-950 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                                    : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                                } ${fieldClass("mode")}`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                          {errors.mode && <FieldError message={errors.mode[0]} />}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            <Clock className="w-3 h-3 inline mr-1" /> Start date & time <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="datetime-local"
                            value={isoToLocalInput(draft.start_date as string)}
                            onChange={(e) => updateDraft("start_date", localInputToIso(e.target.value))}
                            className={`h-11 ${fieldClass("start_date")} ${isDark ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                          />
                          {errors.start_date && <FieldError message={errors.start_date[0]} />}
                        </div>
                        <div className="space-y-1.5">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            <Clock className="w-3 h-3 inline mr-1" /> End date & time <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="datetime-local"
                            value={isoToLocalInput(draft.end_date as string)}
                            onChange={(e) => updateDraft("end_date", localInputToIso(e.target.value))}
                            className={`h-11 ${fieldClass("end_date")} ${isDark ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                          />
                          {errors.end_date && <FieldError message={errors.end_date[0]} />}
                        </div>
                      </div>

                      {/* Location with Accurate Location API Autocomplete & GPS */}
                      <div className="space-y-1.5 relative">
                        <div className="flex items-center justify-between">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            <MapPin className="w-3 h-3 inline mr-1 text-red-500" /> Location / Meeting link {isLocationRequired && <span className="text-red-500">*</span>}
                          </Label>
                          {draft.mode !== "online" && (
                            <button
                              type="button"
                              onClick={handleDetectLocation}
                              disabled={isDetectingLocation}
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                isDark
                                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                                  : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              }`}
                              title="Detect your accurate current location via GPS"
                            >
                              {isDetectingLocation ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                  <span>Detecting…</span>
                                </>
                              ) : (
                                <>
                                  <Crosshair className="w-3 h-3 text-indigo-500" />
                                  <span>Use Accurate Location</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <Input
                            value={draft.location || ""}
                            onChange={(e) => {
                              updateDraft("location", e.target.value);
                              setIsLocationDropdownOpen(true);
                            }}
                            onFocus={() => {
                              if (locationSuggestions.length > 0) setIsLocationDropdownOpen(true);
                            }}
                            placeholder={draft.mode === "online" ? "e.g. Zoom / Google Meet URL" : "e.g. Auditorium Hall, Jaipur (type 3+ chars)"}
                            className={`h-11 pr-20 ${fieldClass("location")} ${isDark ? "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"}`}
                          />
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            {isLoadingLocation && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                            )}
                            {draft.location && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateDraft("location", "");
                                  setLocationSuggestions([]);
                                  setIsLocationDropdownOpen(false);
                                }}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                title="Clear location"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Suggestions Dropdown */}
                        {isLocationDropdownOpen && locationSuggestions.length > 0 && (
                          <div className={`absolute z-50 mt-1 w-full rounded-2xl border shadow-xl max-h-52 overflow-y-auto divide-y ${
                            isDark
                              ? "bg-zinc-900 border-zinc-800 divide-zinc-800 text-zinc-100"
                              : "bg-white border-zinc-200 divide-zinc-100 text-zinc-800"
                          }`}>
                            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50">
                              Suggested Locations (Mapbox API)
                            </div>
                            {locationSuggestions.map((s, idx) => (
                              <button
                                key={`${s.mapboxId || idx}-${s.name}`}
                                type="button"
                                onClick={() => handleSelectLocation(s)}
                                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors ${
                                  isDark
                                    ? "hover:bg-zinc-800 text-zinc-200 hover:text-white"
                                    : "hover:bg-indigo-50 text-zinc-800 hover:text-indigo-950"
                                }`}
                              >
                                <MapPin className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate">{s.name}</p>
                                  {s.address && (
                                    <p className="text-[11px] text-zinc-400 truncate">{s.address}</p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {errors.location && <FieldError message={errors.location[0]} />}
                        {!errors.location && isLocationRequired && !(draft.location || "").toString().trim() && (
                          <p className="text-[11px] font-semibold text-amber-600">
                            Required for offline/hybrid events. Type to search or click &quot;Use Accurate Location&quot;.
                          </p>
                        )}
                      </div>

                      {/* Capacity + Fee */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            <Users className="w-3 h-3 inline mr-1" /> Capacity
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={draft.capacity ?? ""}
                            onChange={(e) => updateDraft("capacity", e.target.value)}
                            placeholder="0 (no limit)"
                            className={`h-11 ${fieldClass("capacity")} ${isDark ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                          />
                          {errors.capacity && <FieldError message={errors.capacity[0]} />}
                        </div>
                        <div className="space-y-1.5">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            <Ticket className="w-3 h-3 inline mr-1" /> Registration fee (₹) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={draft.registration_fee ?? ""}
                            onChange={(e) => updateDraft("registration_fee", e.target.value)}
                            placeholder="0"
                            className={`h-11 ${fieldClass("registration_fee")} ${isDark ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                          />
                          {errors.registration_fee && <FieldError message={errors.registration_fee[0]} />}
                        </div>
                      </div>

                      {/* Registration type */}
                      <div className="space-y-1.5">
                        <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          <ListPlus className="w-3 h-3 inline mr-1" /> Registration type <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2 max-w-sm">
                          {REG_TYPES.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => updateDraft("registration_type", type)}
                              className={`flex-1 h-11 rounded-lg border font-bold text-sm capitalize transition-all ${
                                draft.registration_type === type
                                  ? `${activeAccent.bg} text-white border-transparent shadow-sm`
                                  : isDark
                                  ? "bg-zinc-950 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                              } ${fieldClass("registration_type")}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        {errors.registration_type && <FieldError message={errors.registration_type[0]} />}
                      </div>

                      {/* Team sizes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            Min team size <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={draft.min_team_size ?? ""}
                            onChange={(e) => updateDraft("min_team_size", e.target.value)}
                            className={`h-11 ${fieldClass("min_team_size")} ${isDark ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                          />
                          {errors.min_team_size && <FieldError message={errors.min_team_size[0]} />}
                        </div>
                        <div className="space-y-1.5">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            Max team size <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={draft.max_team_size ?? ""}
                            onChange={(e) => updateDraft("max_team_size", e.target.value)}
                            className={`h-11 ${fieldClass("max_team_size")} ${isDark ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"}`}
                          />
                          {errors.max_team_size && <FieldError message={errors.max_team_size[0]} />}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Label className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            Description <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleAutoGenerateDescription}
                              className={`text-[11px] font-bold flex items-center gap-1 transition-opacity hover:opacity-80 ${activeAccent.text}`}
                              title="Auto-evaluate and fill AI description"
                            >
                              <Wand2 className="w-3 h-3" /> Auto-Fill AI Description
                            </button>
                            {typeof draft.description === "string" && draft.description.length > 0 && (
                              <span className={`text-[11px] font-bold ${(draft.description as string).length >= 20 ? "text-emerald-500" : "text-amber-500"}`}>
                                {(draft.description as string).length} / Min 20
                              </span>
                            )}
                          </div>
                        </div>
                        <textarea
                          rows={5}
                          value={draft.description || ""}
                          onChange={(e) => updateDraft("description", e.target.value)}
                          placeholder="Describe the purpose, highlights and schedule…"
                          className={`w-full rounded-xl border px-3.5 py-3 text-sm resize-y focus:outline-none focus:ring-2 ${activeAccent.ring} ${fieldClass("description")} ${
                            isDark ? "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                          }`}
                        />
                        {errors.description && <FieldError message={errors.description[0]} />}
                      </div>

                      {/* Schedule readout */}
                      {draft.start_date && (
                        <div className={`flex items-center gap-2 text-xs font-semibold rounded-xl px-3.5 py-2.5 ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}>
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Runs {formatDisplayDate(draft.start_date as string)}
                            {draft.end_date ? ` → ${formatDisplayDate(draft.end_date as string)}` : ""}
                          </span>
                        </div>
                      )}

                      {/* Footer actions */}
                      <div className={`border-t pt-5 flex flex-col sm:flex-row items-center gap-3 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                        <Button
                          variant="outline"
                          onClick={handleValidate}
                          disabled={isValidating}
                          className="w-full sm:w-auto rounded-xl font-bold"
                        >
                          {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Validate
                        </Button>
                        <Button
                          onClick={handleCreate}
                          disabled={isCreating || isValidating}
                          className={`w-full sm:w-auto rounded-xl ${activeAccent.bg} hover:opacity-90 text-white font-bold shadow-lg ${activeAccent.shadow}`}
                        >
                          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isCreating ? "Creating…" : "Create Event"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </AppLayout>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-xs font-semibold text-red-500 mt-1">{message}</p>;
}