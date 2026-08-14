"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Check,
  Zap,
  Info,
  ShieldCheck,
  Download,
  AlertTriangle,
  Lock,
  ExternalLink,
  Tag
} from "lucide-react";
import { api } from "@/lib/axios";
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
  onSaved?: () => void;
}

export default function PersonalizeAgendaModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onSaved
}: PersonalizeAgendaModalProps) {
  const { success: showSuccess, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<AgendaItem[]>([]);

  const [agendaChoices, setAgendaChoices] = useState<Record<number, "ACCEPTED" | "DECLINED">>({});
  const [externalChoices, setExternalChoices] = useState<Record<string, "ACCEPTED" | "DECLINED">>({});
  const [isLocked, setIsLocked] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    const generateAndLoadAgenda = async () => {
      try {
        setLoading(true);

        const res = await api.post("/agenda/generate/" + eventId);
        const items: AgendaItem[] = res.data.data || [];
        setSessions(items);

        if (res.data.isCalendarConnected) {
          setIsCalendarConnected(true);
        }

        const hasUnapproved = items.some((item) => item.status === "RECOMMENDED");
        const alreadyLocked = items.length > 0 && !hasUnapproved;
        setIsLocked(alreadyLocked);

        const initialChoices: Record<number, "ACCEPTED" | "DECLINED"> = {};
        const initialExtChoices: Record<string, "ACCEPTED" | "DECLINED"> = {};
        
        const sorted = [...items].sort(
          (a, b) => new Date(a.timeline.start_time).getTime() - new Date(b.timeline.start_time).getTime()
        );
        const overlapGroups: { items: AgendaItem[]; startTime: Date; endTime: Date }[] = [];

        sorted.forEach((item) => {
          const itemStart = new Date(item.timeline.start_time).getTime();
          const itemEnd = item.timeline.end_time
            ? new Date(item.timeline.end_time).getTime()
            : itemStart + 3600000;

          const matchingGroup = overlapGroups.find((g) => {
            const gStart = g.startTime.getTime();
            const gEnd = g.endTime.getTime();
            return itemStart < gEnd && itemEnd > gStart;
          });

          if (matchingGroup) {
            matchingGroup.items.push(item);
            if (itemStart < matchingGroup.startTime.getTime()) matchingGroup.startTime = new Date(itemStart);
            if (itemEnd > matchingGroup.endTime.getTime()) matchingGroup.endTime = new Date(itemEnd);
          } else {
            overlapGroups.push({
              items: [item],
              startTime: new Date(itemStart),
              endTime: new Date(itemEnd)
            });
          }
        });

        overlapGroups.forEach((group) => {
          const slotItems = group.items;
          const accepted = slotItems.find((i) => i.status === "ACCEPTED");
          if (accepted) {
            slotItems.forEach((i) => {
              initialChoices[i.id] = i.id === accepted.id ? "ACCEPTED" : "DECLINED";
            });
          } else {
            slotItems.sort((a, b) => b.match_score - a.match_score);
            slotItems.forEach((i, idx) => {
              initialChoices[i.id] = idx === 0 ? "ACCEPTED" : "DECLINED";
            });
          }

          slotItems.forEach((i) => {
            const list = i.externalConflicts && i.externalConflicts.length > 0
              ? i.externalConflicts
              : (i.externalConflict ? [i.externalConflict] : []);
            list.forEach((ext) => {
              const extId = ext.id || "ext-" + ext.summary + "-" + ext.start;
              initialExtChoices[extId] = "DECLINED";
            });
          });
        });

        setAgendaChoices(initialChoices);
        setExternalChoices(initialExtChoices);
      } catch (err) {
        console.error("Failed to load agenda recommendations:", err);
        showError("Failed to load recommendations.");
      } finally {
        setLoading(false);
      }
    };

    generateAndLoadAgenda();
  }, [isOpen, eventId]);

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
          slotKey: item.timeline.start_time,
          items: [item],
          startTime: new Date(itemStart),
          endTime: new Date(itemEnd)
        });
      }
    });

    return groups;
  }, [sessions]);

  const keepSession = (agendaId: number, slotItems: AgendaItem[]) => {
    if (isLocked) return;
    const newChoices = { ...agendaChoices };
    slotItems.forEach((item) => {
      newChoices[item.id] = item.id === agendaId ? "ACCEPTED" : "DECLINED";
    });
    setAgendaChoices(newChoices);

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
  };

  const removeSession = (agendaId: number) => {
    if (isLocked) return;
    setAgendaChoices((prev) => ({ ...prev, [agendaId]: "DECLINED" }));
  };

  const keepExternal = (targetExtId: string, slotItems: AgendaItem[]) => {
    if (isLocked) return;
    setExternalChoices((prev) => {
      const next = { ...prev };
      slotItems.forEach((item) => {
        const list = item.externalConflicts && item.externalConflicts.length > 0
          ? item.externalConflicts
          : (item.externalConflict ? [item.externalConflict] : []);
        list.forEach((ext) => {
          const extId = ext.id || "ext-" + ext.summary + "-" + ext.start;
          next[extId] = extId === targetExtId ? "ACCEPTED" : "DECLINED";
        });
      });
      return next;
    });

    setAgendaChoices((prev) => {
      const next = { ...prev };
      slotItems.forEach((item) => {
        next[item.id] = "DECLINED";
      });
      return next;
    });
  };

  const removeExternal = (targetExtId: string) => {
    if (isLocked) return;
    setExternalChoices((prev) => ({ ...prev, [targetExtId]: "DECLINED" }));
  };

  const handleApproveAndSave = async () => {
    try {
      setSaving(true);

      await Promise.all(
        Object.entries(agendaChoices).map(([agendaIdStr, status]) =>
          api.patch("/agenda/" + agendaIdStr + "/status", { status })
        )
      );

      setIsLocked(true);
      showSuccess("Personalized agenda approved and locked!");
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Failed to save personal agenda:", err);
      showError("Failed to save personal agenda.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadICS = async () => {
    try {
      const res = await api.get("/agenda/export/ics", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/calendar" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", (eventTitle || "agenda").toLowerCase().replace(/\s+/g, "-") + "-agenda.ics");
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess("Downloaded .ics calendar file!");
    } catch (err) {
      console.error("Download ICS error:", err);
      showError("Failed to download .ics calendar file.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden my-6 border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Personalize Agenda
                </h2>
                {isLocked && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Approved & Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select preferred sessions for <span className="font-semibold text-zinc-700 dark:text-zinc-300">{eventTitle}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadICS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                title="Download .ics Calendar File"
              >
                <Download className="w-3.5 h-3.5" />
                Download .ics
              </button>

              {isCalendarConnected ? (
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-not-allowed opacity-90"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Google Cal Connected
                </button>
              ) : (
                <a
                  href={(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api") + "/auth/google/calendar?token=" + (typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "") + "&returnUrl=" + (typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Connect Google Cal
                </a>
              )}

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
            {loading ? (
              <div className="py-16 text-center text-sm text-zinc-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                <p>Generating personalized recommendations...</p>
              </div>
            ) : slotGroups.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">
                No session timeline published for this event yet.
              </div>
            ) : (
              <div className="space-y-6">
                {slotGroups.map((group) => {
                  const slotItems = group.items;
                  
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

                  const hasExternalConflict = allExternalConflicts.length > 0;
                  const totalCards = slotItems.length + allExternalConflicts.length;
                  const isConflict = totalCards > 1;

                  const startTime = group.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const endTime = group.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const startDate = group.startTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

                  return (
                    <div
                      key={group.slotKey}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/60"
                    >
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{startDate} • {startTime} - {endTime}</span>
                        </div>

                        {isConflict && (
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/50">
                            Schedule Conflict ({totalCards} options) — Choose 1
                          </span>
                        )}
                      </div>

                      <div className={"grid gap-4 " + (totalCards > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                        {allExternalConflicts
                          .map((ext) => {
                            const extId = ext.id || "ext-" + ext.summary + "-" + ext.start;
                            const isKept = (externalChoices[extId] || "DECLINED") === "ACCEPTED";

                          return (
                            <div
                              key={extId}
                              className={"p-4 rounded-xl border transition-all " + (isKept ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 opacity-75")}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                  Google Calendar Event
                                </span>
                                {isKept ? (
                                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Kept
                                  </span>
                                ) : (
                                  <span className="text-xs text-zinc-400">Removed</span>
                                )}
                              </div>

                              <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">
                                {ext.summary}
                              </h4>
                              <p className="text-xs text-zinc-500 mt-1">
                                Scheduled in your personal Google Calendar
                              </p>

                              {!isLocked && (
                                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => isKept ? removeExternal(extId) : keepExternal(extId, slotItems)}
                                    className={"flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors " + (isKept ? "bg-amber-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200")}
                                  >
                                    {isKept ? "Kept" : "Keep Personal Event"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeExternal(extId)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-600"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {slotItems
                          .map((item) => {
                            const choice = agendaChoices[item.id] || "DECLINED";
                            const isKept = choice === "ACCEPTED";
                          const matchPct = Math.round(item.match_score * 100);

                          return (
                            <div
                              key={item.id}
                              className={"p-4 rounded-xl border transition-all flex flex-col justify-between " + (isKept ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 opacity-75")}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                                    {matchPct}% Match
                                  </span>

                                  {isKept ? (
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" /> Kept Session
                                    </span>
                                  ) : (
                                    <span className="text-xs text-zinc-400">Removed</span>
                                  )}
                                </div>

                                <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">
                                  {item.timeline.title}
                                </h4>

                                {item.timeline.description && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                                    {item.timeline.description}
                                  </p>
                                )}

                                {item.matchedSkillTags && item.matchedSkillTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {item.matchedSkillTags.map((tag, tidx) => (
                                      <span
                                        key={tidx}
                                        className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                                  {item.timeline.speaker_name && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-zinc-400" />
                                      {item.timeline.speaker_name}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-zinc-400" />
                                    {item.timeline.location || item.event.location || "Online"}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                                {!isLocked ? (
                                  <div className="flex gap-2 w-full">
                                    <button
                                      type="button"
                                      onClick={() => isKept ? removeSession(item.id) : keepSession(item.id, slotItems)}
                                      className={"flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors " + (isKept ? "bg-emerald-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200")}
                                    >
                                      {isKept ? "Kept" : "Keep Session"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeSession(item.id)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-600"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  item.googleCalendarLink && (
                                    <a
                                      href={item.googleCalendarLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" /> Add to Google Calendar
                                    </a>
                                  )
                                )}
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

          <div className="flex items-center justify-between p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={handleDownloadICS}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600"
            >
              <Download className="w-4 h-4" />
              Download .ics Calendar
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Close
              </button>

              {!isLocked && (
                <button
                  type="button"
                  onClick={handleApproveAndSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Approve & Lock Agenda
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
