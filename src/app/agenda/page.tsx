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
  Download,
  Check,
  X,
  Loader2,
  CalendarCheck,
  Zap,
  Info,
  Layers,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useAgenda } from "@/hooks/useAgenda";

interface AgendaItem {
  id: number;
  user_id: number;
  event_id: number;
  timeline_id: number;
  status: "RECOMMENDED" | "ACCEPTED" | "DECLINED";
  match_score: number;
  created_at: string;
  googleCalendarLink?: string;
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
    banner_url: string | null;
  };
}

export default function PersonalAgendaPage() {
  const { isDark, activeAccent } = useAppearance();
  const { agendas, isLoading: loading, fetchAgenda, updateStatus, downloadICS } = useAgenda();
  const [filter, setFilter] = useState<"ALL" | "RECOMMENDED" | "ACCEPTED">("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  const handleStatusUpdate = async (agendaId: number, status: "ACCEPTED" | "DECLINED") => {
    try {
      setUpdatingId(agendaId);
      await updateStatus(agendaId, status);
      await fetchAgenda();
    } catch (err) {
      console.error("Failed to update agenda status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportICS = async () => {
    await downloadICS();
  };

  // Group agendas by event & time slot to highlight parallel/overlapping sessions
  const groupedSlots = useMemo(() => {
    const activeItems = (agendas as AgendaItem[]).filter((item) => {
      if (filter === "RECOMMENDED") return item.status === "RECOMMENDED";
      if (filter === "ACCEPTED") return item.status === "ACCEPTED";
      return item.status !== "DECLINED";
    });

    const groups: { [slotKey: string]: AgendaItem[] } = {};

    activeItems.forEach((item) => {
      const startTime = new Date(item.timeline.start_time).toISOString();
      const key = `${item.event_id}_${startTime}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.values(groups);
  }, [agendas, filter]);

  const getScoreBadge = (score: number) => {
    const percentage = Math.round(score * 100);
    if (percentage >= 80) {
      return {
        label: `${percentage}% Match`,
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        icon: Sparkles
      };
    } else if (percentage >= 60) {
      return {
        label: `${percentage}% Relevance`,
        bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        icon: Zap
      };
    } else {
      return {
        label: `${percentage}% Related`,
        bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        icon: Info
      };
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header Banner */}
        <div className={`relative overflow-hidden rounded-3xl p-8 ${isDark ? "bg-zinc-900 border border-white/10" : "bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900"} text-white shadow-xl`}>
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-amber-400" />
              ML Personal Agenda Engine
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Personalized Event Schedule
            </h1>
            <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
              When multiple sessions occur at the same time, we display all AI suggestions. Select your preferred meeting to approve and save your custom schedule directly into the database.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/auth/google`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400 text-zinc-950 font-extrabold text-sm shadow-md hover:bg-amber-300 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 text-zinc-950" />
                Connect Live Google Calendar Sync
              </a>

              <button
                onClick={handleExportICS}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/15 transition-all hover:scale-[1.02]"
              >
                <Download className="w-4 h-4 text-indigo-300" />
                Sync Approved Agenda (.ics)
              </button>
            </div>
          </div>

          <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
            <CalendarCheck className="w-96 h-96" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl ${isDark ? "bg-zinc-900 border border-white/10" : "bg-zinc-100"} text-xs font-semibold`}>
            {(["ALL", "RECOMMENDED", "ACCEPTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  filter === tab
                    ? `${activeAccent.bg} text-white shadow-sm font-bold`
                    : `${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}`
                }`}
              >
                {tab === "ALL" && "All Suggestions"}
                {tab === "RECOMMENDED" && "AI Recommended"}
                {tab === "ACCEPTED" && "Approved Schedule"}
              </button>
            ))}
          </div>

          <div className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} font-medium`}>
            {groupedSlots.length} time slots calculated
          </div>
        </div>

        {/* Agenda List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className={`w-8 h-8 animate-spin ${activeAccent.text}`} />
            <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"} font-medium`}>
              Calculating session similarity & schedule conflicts...
            </p>
          </div>
        ) : groupedSlots.length === 0 ? (
          <div className={`text-center py-16 px-4 rounded-3xl ${isDark ? "bg-zinc-900/50 border border-white/5" : "bg-white border border-zinc-200/70"} shadow-sm space-y-4`}>
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
              No agenda sessions found
            </h3>
            <p className={`text-sm max-w-md mx-auto ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Register for an event to automatically generate AI agenda recommendations.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {groupedSlots.map((slotItems) => {
                const isMultiTrack = slotItems.length > 1;
                const first = slotItems[0];
                const startTime = new Date(first.timeline.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const startDate = new Date(first.timeline.start_time).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                });

                return (
                  <motion.div
                    key={`${first.event_id}_${first.timeline.start_time}`}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`rounded-3xl p-6 transition-all ${
                      isMultiTrack
                        ? isDark
                          ? "bg-amber-950/20 border-2 border-amber-500/30"
                          : "bg-amber-50/50 border-2 border-amber-200"
                        : isDark
                        ? "bg-zinc-900/80 border border-white/10"
                        : "bg-white border border-zinc-200/70"
                    }`}
                  >
                    {/* Header Slot Label */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-zinc-100 dark:border-white/5 pb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <Clock className="w-4 h-4" />
                        <span>{startDate} • {startTime}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-600 dark:text-zinc-300">{first.event.title}</span>
                      </div>

                      {isMultiTrack && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Layers className="w-3.5 h-3.5" />
                          Parallel Sessions ({slotItems.length} Choices) - Pick One
                        </div>
                      )}
                    </div>

                    {/* Session Cards Grid */}
                    <div className={`grid gap-4 ${isMultiTrack ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                      {slotItems.map((item) => {
                        const scoreBadge = getScoreBadge(item.match_score);
                        const BadgeIcon = scoreBadge.icon;
                        const isUpdating = updatingId === item.id;
                        const isApproved = item.status === "ACCEPTED";

                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all ${
                              isApproved
                                ? "bg-emerald-500/10 border-2 border-emerald-500/40 shadow-sm"
                                : isDark
                                ? "bg-zinc-800/60 border border-white/5 hover:border-white/20"
                                : "bg-zinc-50 border border-zinc-200 hover:border-indigo-200"
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreBadge.bg}`}>
                                  <BadgeIcon className="w-3 h-3" />
                                  {scoreBadge.label}
                                </span>

                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Approved & Saved in DB
                                  </span>
                                )}
                              </div>

                              <h4 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                                {item.timeline.title}
                              </h4>

                              {item.timeline.description && (
                                <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"} line-clamp-2`}>
                                  {item.timeline.description}
                                </p>
                              )}

                              <div className={`flex flex-wrap items-center gap-3 text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                                {item.timeline.speaker_name && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-purple-500" />
                                    <span>{item.timeline.speaker_name}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                  <span>{item.timeline.location || item.event.location || "Online"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-white/5">
                              {item.googleCalendarLink && (
                                <a
                                  href={item.googleCalendarLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Google Calendar
                                </a>
                              )}

                              {!isApproved ? (
                                <button
                                  onClick={() => handleStatusUpdate(item.id, "ACCEPTED")}
                                  disabled={isUpdating}
                                  className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white ${activeAccent.bg} hover:opacity-90 shadow-sm transition-all`}
                                >
                                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Approve & Keep This Meeting
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusUpdate(item.id, "DECLINED")}
                                  disabled={isUpdating}
                                  className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                >
                                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                  Unselect
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
