"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  X,
  Loader2,
  Check,
  AlertTriangle,
  Download,
  ExternalLink,
  Tag,
  Edit3
} from "lucide-react";
import { api } from "@/lib/axios";
import { API_BASE_URL } from "@/config/env";
import { useToast } from "@/components/providers/ToastProvider";

interface ExternalConflict {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  isExternal?: boolean;
}

interface AgendaItem {
  id: number;
  user_id: number;
  event_id: number;
  timeline_id: number;
  status: "RECOMMENDED" | "ACCEPTED" | "DECLINED";
  match_score: number;
  created_at: string;
  googleCalendarLink?: string;
  matchedSkillTags?: string[];
  externalConflicts?: ExternalConflict[];
  externalConflict?: ExternalConflict | null;
  timeline: {
    id: number;
    title: string;
    description: string | null;
    speaker_name: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
  };
  event: {
    id: number;
    title: string;
    start_date: string;
    end_date: string;
    location: string | null;
  };
}

interface PersonalizeAgendaModalProps {
  eventId: number;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedAgendas?: any[]) => void;
  timelinesFallback?: any[];
}

export default function PersonalizeAgendaModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onSaved,
  timelinesFallback = []
}: PersonalizeAgendaModalProps) {
  const { success: showSuccess, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<AgendaItem[]>([]);

  // Keyed by timelineId (number) -> "ACCEPTED" | "DECLINED"
  const [agendaChoices, setAgendaChoices] = useState<Record<number, "ACCEPTED" | "DECLINED">>({});
  const [externalChoices, setExternalChoices] = useState<Record<string, "ACCEPTED" | "DECLINED">>({});
  const [hasCustomizedBefore, setHasCustomizedBefore] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  // Load and combine recommendations with full original event agenda
  const loadAgendaData = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);

      // 1. Fetch existing user agenda first
      let items: AgendaItem[] = [];
      let fetchedExisting = false;
      try {
        const getRes = await api.get(`/agenda?eventId=${eventId}`);
        const data = (getRes.data?.data || []).filter(
          (i: any) => Number(i.event_id || i.event?.id) === Number(eventId)
        );
        if (data && data.length > 0) {
          items = data;
          fetchedExisting = true;
        }
        if (getRes.data?.isCalendarConnected) {
          setIsCalendarConnected(true);
        }
      } catch (getErr) {
        console.warn("Could not fetch existing agenda, will generate:", getErr);
      }

      // If user has not generated/saved agenda for this event yet, generate ML recommendations
      if (!fetchedExisting || items.length === 0) {
        try {
          const res = await api.post("/agenda/generate/" + eventId);
          items = res.data?.data || [];
          if (res.data?.isCalendarConnected) {
            setIsCalendarConnected(true);
          }
        } catch (genErr) {
          console.warn("Could not generate recommendations:", genErr);
        }
      }

      // 2. Ensure ALL sessions from the original event agenda (timelinesFallback) are present!
      const finalSessions: AgendaItem[] = [...items];
      if (timelinesFallback && timelinesFallback.length > 0) {
        timelinesFallback.forEach((fb: any) => {
          const fbId = Number(fb.id);
          const exists = finalSessions.some(
            (s) => Number(s.timeline_id || s.timeline?.id || s.id) === fbId
          );
          if (!exists) {
            finalSessions.push({
              id: fbId,
              user_id: 0,
              event_id: eventId,
              timeline_id: fbId,
              status: "RECOMMENDED",
              match_score: 0.85,
              created_at: new Date().toISOString(),
              timeline: {
                id: fbId,
                title: fb.title,
                description: fb.description || null,
                speaker_name: fb.speaker_name || null,
                start_time: fb.start_time,
                end_time: fb.end_time || null,
                location: fb.location || null
              },
              event: {
                id: eventId,
                title: eventTitle,
                start_date: fb.start_time,
                end_date: fb.end_time || fb.start_time,
                location: fb.location || null
              }
            });
          }
        });
      }

      // Normalize all sessions to have valid timeline and consistent timeline_id
      const normalizedSessions = finalSessions.map((s) => {
        const tId = Number(s.timeline_id || s.timeline?.id || s.id);
        const fbTl = timelinesFallback.find((fb: any) => Number(fb.id) === tId);
        return {
          ...s,
          timeline_id: tId,
          timeline: {
            id: tId,
            title: s.timeline?.title || fbTl?.title || "Agenda Session",
            description: s.timeline?.description || fbTl?.description || null,
            speaker_name: s.timeline?.speaker_name || fbTl?.speaker_name || null,
            start_time: s.timeline?.start_time || fbTl?.start_time || new Date().toISOString(),
            end_time: s.timeline?.end_time || fbTl?.end_time || null,
            location: s.timeline?.location || fbTl?.location || null
          }
        };
      });

      setSessions(normalizedSessions);

      // 3. Determine if user has already customized their agenda for this event
      const previouslyCustomized = normalizedSessions.some(
        (i) => i.status === "ACCEPTED" || i.status === "DECLINED"
      );
      setHasCustomizedBefore(previouslyCustomized);

      // 4. Initialize choices
      const initialChoices: Record<number, "ACCEPTED" | "DECLINED"> = {};
      const initialExtChoices: Record<string, "ACCEPTED" | "DECLINED"> = {};

      if (previouslyCustomized) {
        // Respect EXACT previously saved choices
        normalizedSessions.forEach((i) => {
          const tId = Number(i.timeline_id);
          initialChoices[tId] = i.status === "ACCEPTED" ? "ACCEPTED" : "DECLINED";
        });
      } else {
        // First-time recommendation initialization:
        // Group into overlapping time slots
        const sorted = [...normalizedSessions].sort(
          (a, b) => new Date(a.timeline.start_time).getTime() - new Date(b.timeline.start_time).getTime()
        );

        const groups: { items: AgendaItem[]; startTime: Date; endTime: Date }[] = [];
        sorted.forEach((item) => {
          const itemStart = new Date(item.timeline.start_time).getTime();
          const itemEnd = item.timeline.end_time
            ? new Date(item.timeline.end_time).getTime()
            : itemStart + 3600000;

          const matching = groups.find((g) => {
            const gStart = g.startTime.getTime();
            const gEnd = g.endTime.getTime();
            return itemStart < gEnd && itemEnd > gStart;
          });

          if (matching) {
            matching.items.push(item);
            if (itemStart < matching.startTime.getTime()) matching.startTime = new Date(itemStart);
            if (itemEnd > matching.endTime.getTime()) matching.endTime = new Date(itemEnd);
          } else {
            groups.push({
              items: [item],
              startTime: new Date(itemStart),
              endTime: new Date(itemEnd)
            });
          }
        });

        // For each group, choose highest match score as default ACCEPTED, others DECLINED
        groups.forEach((group) => {
          const slotItems = group.items;
          slotItems.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
          slotItems.forEach((item, idx) => {
            const tId = Number(item.timeline_id);
            initialChoices[tId] = idx === 0 ? "ACCEPTED" : "DECLINED";
          });
        });
      }

      // External Google Calendar conflicts default to DECLINED
      normalizedSessions.forEach((i) => {
        const list = i.externalConflicts && i.externalConflicts.length > 0
          ? i.externalConflicts
          : (i.externalConflict ? [i.externalConflict] : []);
        list.forEach((ext) => {
          const extId = ext.id || "ext-" + ext.summary + "-" + ext.start;
          initialExtChoices[extId] = "DECLINED";
        });
      });

      setAgendaChoices(initialChoices);
      setExternalChoices(initialExtChoices);
    } catch (err) {
      console.error("Failed to load agenda builder data:", err);
      showError("Could not load agenda data.");
    } finally {
      setLoading(false);
    }
  }, [eventId, eventTitle, timelinesFallback, showError]);

  useEffect(() => {
    if (isOpen && eventId) {
      loadAgendaData();
    }
  }, [isOpen, eventId, loadAgendaData]);

  // Compute time-slot groups with overlapping sessions
  const slotGroups = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const sorted = [...sessions].sort(
      (a, b) => new Date(a.timeline.start_time).getTime() - new Date(b.timeline.start_time).getTime()
    );

    const groups: { slotKey: string; items: AgendaItem[]; startTime: Date; endTime: Date }[] = [];

    sorted.forEach((item) => {
      const itemStart = new Date(item.timeline.start_time).getTime();
      const itemEnd = item.timeline.end_time
        ? new Date(item.timeline.end_time).getTime()
        : itemStart + 3600000;

      const matchingGroup = groups.find((g) => {
        const gStart = g.startTime.getTime();
        const gEnd = g.endTime.getTime();
        return itemStart < gEnd && itemEnd > gStart;
      });

      if (matchingGroup) {
        matchingGroup.items.push(item);
        if (itemStart < matchingGroup.startTime.getTime()) matchingGroup.startTime = new Date(itemStart);
        if (itemEnd > matchingGroup.endTime.getTime()) matchingGroup.endTime = new Date(itemEnd);
      } else {
        groups.push({
          slotKey: String(item.timeline.start_time) + "-" + item.id,
          items: [item],
          startTime: new Date(itemStart),
          endTime: new Date(itemEnd)
        });
      }
    });

    return groups;
  }, [sessions]);

  // Toggle selection for a session card:
  // In an overlapping conflict slot, selecting a session selects it and deselects other choices in that slot
  const toggleSession = (tId: number, slotItems: AgendaItem[]) => {
    const currentStatus = agendaChoices[tId] || "DECLINED";
    const willBeAccepted = currentStatus !== "ACCEPTED";

    const nextChoices = { ...agendaChoices };

    if (willBeAccepted) {
      // Accept this session, decline all other sessions in this overlapping slot
      slotItems.forEach((item) => {
        const itemId = Number(item.timeline_id || item.timeline?.id || item.id);
        nextChoices[itemId] = itemId === tId ? "ACCEPTED" : "DECLINED";
      });
      // Also decline any external Google Calendar events for this slot
      setExternalChoices((prev) => {
        const next = { ...prev };
        slotItems.forEach((item) => {
          const list = item.externalConflicts && item.externalConflicts.length > 0
            ? item.externalConflicts
            : (item.externalConflict ? [item.externalConflict] : []);
          list.forEach((ext) => {
            const extId = ext.id || "ext-" + ext.summary + "-" + ext.start;
            next[extId] = "DECLINED";
          });
        });
        return next;
      });
    } else {
      // Uncheck this session
      nextChoices[tId] = "DECLINED";
    }

    setAgendaChoices(nextChoices);
  };

  // Toggle selection for an external Google Calendar personal event
  const toggleExternal = (targetExtId: string, slotItems: AgendaItem[]) => {
    const currentStatus = externalChoices[targetExtId] || "DECLINED";
    const willBeAccepted = currentStatus !== "ACCEPTED";

    setExternalChoices((prev) => {
      const next = { ...prev };
      slotItems.forEach((item) => {
        const list = item.externalConflicts && item.externalConflicts.length > 0
          ? item.externalConflicts
          : (item.externalConflict ? [item.externalConflict] : []);
        list.forEach((ext) => {
          const extId = ext.id || "ext-" + ext.summary + "-" + ext.start;
          next[extId] = (willBeAccepted && extId === targetExtId) ? "ACCEPTED" : "DECLINED";
        });
      });
      return next;
    });

    if (willBeAccepted) {
      // Decline all event sessions in this slot because user chose their personal Google Cal event
      setAgendaChoices((prev) => {
        const next = { ...prev };
        slotItems.forEach((item) => {
          const itemId = Number(item.timeline_id || item.timeline?.id || item.id);
          next[itemId] = "DECLINED";
        });
        return next;
      });
    }
  };

  // Save Choices to Backend
  const handleApproveAndSave = async () => {
    try {
      setSaving(true);

      // Primary: Call the atomic batch save endpoint /agenda/save/:eventId
      let batchSuccess = false;
      let savedAgendas: any[] = [];
      try {
        const res = await api.post("/agenda/save/" + eventId, {
          choices: agendaChoices
        });
        if (res.data?.data && Array.isArray(res.data.data)) {
          savedAgendas = res.data.data;
        }
        batchSuccess = true;
      } catch (batchErr) {
        console.warn("Batch save endpoint failed, trying fallback patch:", batchErr);
      }

      // Fallback: If batch endpoint wasn't reached, update individually
      if (!batchSuccess) {
        for (const [tIdStr, status] of Object.entries(agendaChoices)) {
          const session = sessions.find(
            (s) => Number(s.timeline_id || s.timeline?.id || s.id) === Number(tIdStr)
          );
          const agendaId = session?.id;
          if (agendaId) {
            await api.patch("/agenda/" + agendaId + "/status", { status }).catch(() => { });
          }
        }
        try {
          const refetch = await api.get(`/agenda?eventId=${eventId}`);
          if (refetch.data?.data) {
            savedAgendas = refetch.data.data;
          }
        } catch { }
      }

      setHasCustomizedBefore(true);
      showSuccess("Personalized agenda preferences saved!");
      if (onSaved) onSaved(savedAgendas);
      onClose();
    } catch (err) {
      console.error("Failed to save personal agenda:", err);
      showError("Failed to save personal agenda.");
    } finally {
      setSaving(false);
    }
  };

  // Download .ics
  const handleDownloadICS = async () => {
    try {
      const res = await api.get("/agenda/export/ics", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/calendar" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", (eventTitle || "agenda").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-agenda.ics");
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess("Downloaded .ics calendar file!");
    } catch (err) {
      // Direct client fallback
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Eventrix//Agenda//EN\nBEGIN:VEVENT\nSUMMARY:${eventTitle}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${eventTitle.replace(/\s+/g, "_")}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Exported .ics calendar file!");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl rounded-[24px] overflow-hidden my-6 flex flex-col shadow-2xl border"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--text)"
          }}
        >
          {/* =========================================================
              HEADER
              ========================================================= */}
          <div
            className="flex items-center justify-between p-6 border-b flex-wrap gap-4"
            style={{
              borderColor: "var(--border)",
              background: "var(--chrome)"
            }}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                    color: "var(--accent)"
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                >
                  Personalize My Agenda
                </h2>
                {hasCustomizedBefore && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Personalized
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                Customize your schedule from the original event agenda, choose conflicting sessions, and save your personal plan.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isCalendarConnected ? (
                <span className="h-[32px] px-3 rounded-[10px] text-[12px] font-semibold inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Check className="w-3.5 h-3.5" />
                  Google Cal Connected
                </span>
              ) : (
                <a
                  href={`${API_BASE_URL}/auth/google/calendar?token=${typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : ""}&returnUrl=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                  className="h-[32px] px-3 rounded-[10px] text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    background: "var(--input)",
                    border: "1px solid var(--border)",
                    color: "var(--text)"
                  }}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Connect Google Cal
                </a>
              )}

              <button
                type="button"
                onClick={handleDownloadICS}
                className="h-[32px] px-3 rounded-[10px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                style={{
                  background: "var(--input)",
                  border: "1px solid var(--border)",
                  color: "var(--text)"
                }}
                title="Download .ics Calendar File"
              >
                <Download className="w-3.5 h-3.5" />
                .ics
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--subtle)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* =========================================================
              BODY / SLOTS LIST
              ========================================================= */}
          <div className="p-6 max-h-[62vh] overflow-y-auto space-y-6">
            {loading ? (
              <div className="py-20 text-center text-sm text-[var(--muted)] space-y-3">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-[var(--accent)]" />
                <p className="font-medium">Loading original event agenda & checking schedule conflicts...</p>
              </div>
            ) : slotGroups.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--muted)]">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No session timelines published for this event yet.
              </div>
            ) : (
              <div className="space-y-6">
                {slotGroups.map((group) => {
                  const slotItems = group.items;

                  // Collect all Google Calendar conflicts for this time slot
                  const allExternalConflicts: ExternalConflict[] = [];
                  const conflictMap = new Map<string, ExternalConflict>();
                  slotItems.forEach((i) => {
                    const list = i.externalConflicts && i.externalConflicts.length > 0
                      ? i.externalConflicts
                      : (i.externalConflict ? [i.externalConflict] : []);
                    list.forEach((ext) => {
                      if (ext && ext.summary) {
                        const key = ext.summary + "-" + ext.start;
                        if (!conflictMap.has(key)) {
                          conflictMap.set(key, ext);
                          allExternalConflicts.push(ext);
                        }
                      }
                    });
                  });

                  const totalCards = slotItems.length + allExternalConflicts.length;
                  const isConflict = totalCards > 1;

                  const startTime = group.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const endTime = group.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const startDate = group.startTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

                  return (
                    <div
                      key={group.slotKey}
                      className="rounded-[20px] p-5 flex flex-col gap-4 border"
                      style={{
                        background: "var(--card2)",
                        borderColor: "var(--border)"
                      }}
                    >
                      {/* Slot Header */}
                      <div
                        className="flex items-center justify-between pb-3 border-b flex-wrap gap-2"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[var(--text)]">
                          <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>{startDate} · {startTime} - {endTime}</span>
                        </div>

                        {isConflict ? (
                          <span className="text-[11.5px] font-semibold text-[#f59e0b] bg-[rgba(245,158,11,0.12)] px-3 py-1 rounded-full border border-[rgba(245,158,11,0.25)] flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Schedule Conflict ({totalCards} options) · Choose 1
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[var(--subtle)]">
                            Single Session Available
                          </span>
                        )}
                      </div>

                      {/* Cards Grid: Card-like UI with Top-Right Checkbox */}
                      <div className={`grid gap-3.5 ${totalCards > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>

                        {/* 1. Google Calendar External Conflict Cards */}
                        {allExternalConflicts.map((ext) => {
                          const extId = ext.id || "ext-" + ext.summary + "-" + ext.start;
                          const isKept = (externalChoices[extId] || "DECLINED") === "ACCEPTED";

                          return (
                            <div
                              key={extId}
                              onClick={() => toggleExternal(extId, slotItems)}
                              className={`p-4 rounded-[16px] border transition-all cursor-pointer flex flex-col justify-between gap-3 relative group ${isKept
                                  ? "shadow-md"
                                  : "opacity-75 hover:opacity-100"
                                }`}
                              style={{
                                background: isKept
                                  ? "rgba(245, 158, 11, 0.08)"
                                  : "var(--input)",
                                borderColor: isKept
                                  ? "#f59e0b"
                                  : "var(--border)"
                              }}
                            >
                              {/* Top Bar inside card: Label + TOP-RIGHT CHECKBOX */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-[#f59e0b] bg-[#f59e0b]/15 px-2.5 py-0.5 rounded-full border border-[#f59e0b]/30">
                                  Google Calendar Event
                                </span>

                                {/* TOP-RIGHT CHECKBOX */}
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${isKept
                                      ? "bg-[#f59e0b] border-[#f59e0b] text-white shadow-xs"
                                      : "border-[var(--border)] bg-[var(--input)]"
                                    }`}
                                >
                                  {isKept && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                </div>
                              </div>

                              {/* Card Content */}
                              <div>
                                <h4 className="font-bold text-[14.5px] text-[var(--text)]">
                                  {ext.summary}
                                </h4>
                                <p className="text-[12px] text-[var(--muted)] mt-1">
                                  Scheduled in your connected personal Google Calendar.
                                </p>
                              </div>

                              {/* Footer Status */}
                              <div
                                className="pt-2 border-t flex items-center justify-between text-xs font-semibold"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <span style={{ color: isKept ? "#f59e0b" : "var(--subtle)" }}>
                                  {isKept ? "Keep Personal Meeting" : "Click to select"}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* 2. Event Timeline Session Cards */}
                        {slotItems.map((item) => {
                          const tId = Number(item.timeline_id || item.timeline?.id || item.id);
                          const choice = agendaChoices[tId] || "DECLINED";
                          const isKept = choice === "ACCEPTED";
                          const matchPct = Math.round((item.match_score || 0.85) * 100);

                          return (
                            <div
                              key={tId}
                              onClick={() => toggleSession(tId, slotItems)}
                              className={`p-4 rounded-[16px] border transition-all cursor-pointer flex flex-col justify-between gap-3 relative group ${isKept
                                  ? "shadow-md"
                                  : "opacity-75 hover:opacity-100"
                                }`}
                              style={{
                                background: isKept
                                  ? "color-mix(in oklab, var(--accent) 12%, var(--card))"
                                  : "var(--input)",
                                borderColor: isKept
                                  ? "var(--accent)"
                                  : "var(--border)"
                              }}
                            >
                              {/* Top Bar inside card: Match Badge + TOP-RIGHT CHECKBOX */}
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                                  style={{
                                    background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                                    color: "var(--accent)"
                                  }}
                                >
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  {matchPct}% Match
                                </span>

                                {/* TOP-RIGHT CHECKBOX */}
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${isKept
                                      ? "text-white shadow-xs"
                                      : "border-[var(--border)] bg-[var(--input)]"
                                    }`}
                                  style={{
                                    backgroundColor: isKept ? "var(--accent)" : "transparent",
                                    borderColor: isKept ? "var(--accent)" : "var(--border)",
                                    color: "#ffffff"
                                  }}
                                >
                                  {isKept && <Check className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: "#ffffff" }} />}
                                </div>
                              </div>

                              {/* Card Content */}
                              <div className="space-y-1.5">
                                <h4
                                  className="font-bold text-[14.5px] leading-snug text-[var(--text)]"
                                  style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                                >
                                  {item.timeline.title}
                                </h4>

                                {item.timeline.description && (
                                  <p className="text-[12px] text-[var(--muted)] line-clamp-2 leading-relaxed">
                                    {item.timeline.description}
                                  </p>
                                )}

                                {/* Skills Tags */}
                                {item.matchedSkillTags && item.matchedSkillTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {item.matchedSkillTags.map((tag, tidx) => (
                                      <span
                                        key={tidx}
                                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                        style={{
                                          background: "var(--card2)",
                                          color: "var(--subtle)",
                                          border: "1px solid var(--border)"
                                        }}
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Card Footer: Metadata (Speaker & Location) + Selected Status */}
                              <div
                                className="pt-2.5 border-t flex items-center justify-between text-xs"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <div className="flex items-center gap-3 text-[var(--subtle)] truncate">
                                  {item.timeline.speaker_name && (
                                    <span className="flex items-center gap-1 truncate">
                                      <User className="w-3 h-3 opacity-70" />
                                      {item.timeline.speaker_name}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 opacity-70" />
                                    {item.timeline.location || item.event?.location || "Main Hall"}
                                  </span>
                                </div>

                                <span
                                  className="font-semibold shrink-0"
                                  style={{
                                    color: isKept ? "var(--accent)" : "var(--subtle)"
                                  }}
                                >
                                  {isKept ? "Selected" : "Click to select"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =========================================================
              FOOTER
              ========================================================= */}
          <div
            className="flex items-center justify-between p-6 border-t flex-wrap gap-3"
            style={{
              borderColor: "var(--border)",
              background: "var(--chrome)"
            }}
          >
            <button
              type="button"
              onClick={handleDownloadICS}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .ics Calendar
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-[38px] px-4 rounded-[12px] text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer border"
                style={{
                  background: "var(--input)",
                  borderColor: "var(--border)"
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleApproveAndSave}
                disabled={saving}
                className="h-[38px] px-5 rounded-[12px] font-semibold text-xs transition-opacity cursor-pointer flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  color: "#ffffff"
                }}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                {hasCustomizedBefore ? "Update Personalized Agenda" : "Save Personalized Agenda"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
