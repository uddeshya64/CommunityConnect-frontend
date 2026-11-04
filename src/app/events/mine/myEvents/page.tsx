"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  CalendarDays,
  Radio,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  CalendarX,
  Users,
  Compass,
} from "lucide-react";
import { eventService } from "@/services/event.service";
import AppLayout from "@/components/layout/AppLayout";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useUser } from "@/components/providers/UserProvider";
import EventCard from "@/components/events/EventCard";

interface MyEventItem {
  id: string;
  title: string;
  category: string;
  mode: string;
  date: string;
  endDate?: string | null;
  location: string;
  city: string;
  fee: string;
  reg: number;
  cap: number;
  pct: string;
  regLabel: string;
  bannerUrl?: string | null;
  photo?: string;
  relationship: "Admin" | "Staff" | "Participant";
  staffRoleName?: string;
  teamId?: number | null;
  targetHref: string;
  isLive: boolean;
  isConcluded: boolean;
}

export default function MyEventsPage() {
  const { isDark, activeAccent } = useAppearance();
  const { profile } = useUser();
  const userId = profile?.id;

  const [rawFeedEvents, setRawFeedEvents] = useState<any[]>([]);
  const [contributedEvents, setContributedEvents] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filter tabs
  const [statusTab, setStatusTab] = useState<"all" | "upcoming" | "live" | "concluded">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "Admin" | "Staff" | "Participant">("all");
  const [visibleCount, setVisibleCount] = useState(12);

  // Load saved events
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cc_saved_events");
      if (stored) setSavedIds(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const toggleSave = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const willSave = !savedIds[id];
    setSavedIds((prev) => ({ ...prev, [id]: willSave }));
    try {
      localStorage.setItem("cc_saved_events", JSON.stringify({ ...savedIds, [id]: willSave }));
      if (willSave) {
        await eventService.saveEvent(id);
      } else {
        await eventService.unsaveEvent(id);
      }
    } catch (err) {
      console.error("Failed to sync bookmark:", err);
    }
  };

  // Fetch feed and contributed events
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const feedPromise = eventService.getFeed({ limit: 100 }).catch(() => null);
        const contribPromise = eventService.getContributedEvents().catch(() => []);
        const [feedRes, contribRes] = await Promise.all([feedPromise, contribPromise]);

        let list: any[] = [];
        if (Array.isArray(feedRes)) list = feedRes;
        else if (feedRes?.data?.events) list = feedRes.data.events;
        else if (feedRes?.data && Array.isArray(feedRes.data)) list = feedRes.data;
        else if (feedRes?.events) list = feedRes.events;
        setRawFeedEvents(list);

        const contribList = Array.isArray(contribRes) ? contribRes : contribRes?.data || [];
        setContributedEvents(contribList);
      } catch (err) {
        console.error("Failed to fetch my events data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compile all user-associated events across Admin, Staff, and Participant roles
  const allMyEvents = useMemo(() => {
    const map = new Map<string, MyEventItem>();
    const now = Date.now();

    const computeEventStatus = (startVal?: string, endVal?: string, statusVal?: string) => {
      if (statusVal === "live") return { isLive: true, isConcluded: false };
      if (statusVal === "concluded" || statusVal === "completed") return { isLive: false, isConcluded: true };
      if (!startVal) return { isLive: false, isConcluded: false };
      const startMs = new Date(startVal).getTime();
      const endMs = endVal ? new Date(endVal).getTime() : startMs + 24 * 60 * 60 * 1000;
      if (now >= startMs && now <= endMs) return { isLive: true, isConcluded: false };
      if (now > endMs) return { isLive: false, isConcluded: true };
      return { isLive: false, isConcluded: false };
    };

    // 1. Events user created (Admin / Organizer)
    const userCreated = userId
      ? rawFeedEvents.filter((e) => String(e.created_by) === String(userId))
      : [];

    userCreated.forEach((evt) => {
      const eid = String(evt.id || evt._id);
      const cap = Number(evt.capacity || 200);
      const reg = Number(evt.registered_count ?? evt.registrations_count ?? evt._count?.registrations ?? 0);
      const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
      const { isLive, isConcluded } = computeEventStatus(evt.start_date, evt.end_date, evt.status);

      map.set(eid, {
        id: eid,
        title: evt.title || "Untitled Event",
        category: evt.type?.name || evt.type || evt.category || "Hackathon",
        mode: evt.mode || "In-person",
        date: evt.start_date
          ? new Date(evt.start_date).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
          : "TBA",
        endDate: evt.end_date || null,
        location: evt.location || "TBA",
        city: evt.city || evt.location?.split(/[,•·-]/)[0]?.trim() || "TBA",
        fee: evt.ticket_price ? `₹${evt.ticket_price}` : "Free",
        reg,
        cap,
        pct: `${pct}%`,
        regLabel: `${reg} / ${cap}`,
        bannerUrl: evt.banner_url || null,
        photo: evt.banner_url || undefined,
        relationship: "Admin",
        targetHref: `/events/${eid}`,
        isLive,
        isConcluded,
      });
    });

    // 2. Events user is Staff / Contributor for
    (contributedEvents || []).forEach((evt) => {
      const eid = String(evt.id || evt._id);
      if (!eid) return;
      const cap = Number(evt.capacity || 200);
      const reg = Number(evt.registered_count ?? evt.attendees ?? 0);
      const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
      const { isLive, isConcluded } = computeEventStatus(evt.start_date || evt.date, evt.end_date, evt.status);

      map.set(eid, {
        id: eid,
        title: evt.title || "Contributed Event",
        category: evt.type?.name || evt.type || "Event",
        mode: evt.mode || "In-person",
        date: (evt.start_date || evt.date)
          ? new Date(evt.start_date || evt.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
          : "TBA",
        endDate: evt.end_date || null,
        location: evt.location || "TBA",
        city: evt.location?.split(/[,•·-]/)[0]?.trim() || "TBA",
        fee: evt.ticket_price ? `₹${evt.ticket_price}` : "Free",
        reg,
        cap,
        pct: `${pct}%`,
        regLabel: `${reg} / ${cap}`,
        bannerUrl: evt.banner_url || null,
        photo: evt.banner_url || undefined,
        relationship: "Staff",
        staffRoleName: evt.staffRoleName || "Staff Member",
        targetHref: `/events/${eid}`,
        isLive,
        isConcluded,
      });
    });

    // 3. Events user registered for as a Participant
    (profile?.registrations || []).forEach((r: any) => {
      const evt = r.event;
      if (!evt || !evt.id) return;
      const eid = String(evt.id);
      if (map.has(eid)) return; // Admin and Staff take precedence

      const cap = Number(evt.capacity || 200);
      const reg = Number(evt.registered_count ?? evt._count?.registrations ?? 0);
      const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
      const { isLive, isConcluded } = computeEventStatus(evt.start_date, evt.end_date, evt.status);

      map.set(eid, {
        id: eid,
        title: evt.title || "Registered Event",
        category: evt.type?.name || evt.type || "Event",
        mode: evt.mode || "In-person",
        date: evt.start_date
          ? new Date(evt.start_date).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
          : "TBA",
        endDate: evt.end_date || null,
        location: evt.location || "TBA",
        city: evt.location?.split(/[,•·-]/)[0]?.trim() || "TBA",
        fee: evt.ticket_price ? `₹${evt.ticket_price}` : "Free",
        reg,
        cap,
        pct: `${pct}%`,
        regLabel: `${reg} / ${cap}`,
        bannerUrl: evt.banner_url || null,
        photo: evt.banner_url || undefined,
        relationship: "Participant",
        teamId: r.team_id || null,
        targetHref: r.team_id ? `/dashboard/team/${r.team_id}` : `/events/${eid}`,
        isLive,
        isConcluded,
      });
    });

    return Array.from(map.values());
  }, [rawFeedEvents, contributedEvents, profile, userId]);

  // Counts for tabs
  const upcomingCount = useMemo(() => allMyEvents.filter((e) => !e.isLive && !e.isConcluded).length, [allMyEvents]);
  const liveCount = useMemo(() => allMyEvents.filter((e) => e.isLive).length, [allMyEvents]);
  const concludedCount = useMemo(() => allMyEvents.filter((e) => e.isConcluded).length, [allMyEvents]);

  // Filtered by tab and role
  const filteredEvents = useMemo(() => {
    return allMyEvents.filter((e) => {
      // Tab filter
      if (statusTab === "upcoming" && (e.isLive || e.isConcluded)) return false;
      if (statusTab === "live" && !e.isLive) return false;
      if (statusTab === "concluded" && !e.isConcluded) return false;

      // Role filter
      if (roleFilter !== "all" && e.relationship !== roleFilter) return false;

      return true;
    });
  }, [allMyEvents, statusTab, roleFilter]);

  return (
    <AppLayout>
      <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-8 py-7 pb-20 flex flex-col gap-6 animate-ccin">
        {/* HEADER: No Host Event button as per Bug List requirements */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold" style={{ color: "var(--subtle)" }}>
            <span>WORKSPACE</span>
            <span>/</span>
            <span>PORTFOLIO</span>
          </div>
          <h1 className="font-bricolage text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            My Events
          </h1>
          <p className="text-sm sm:text-base max-w-2xl leading-relaxed" style={{ color: "var(--muted)" }}>
            View and manage all events where you hold an active role as an organizer (Admin), staff contributor, or registered participant.
          </p>
        </div>

        {/* STATUS TABS & ROLE FILTER ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "all", label: `All (${allMyEvents.length})`, icon: CalendarDays },
              { id: "upcoming", label: `Upcoming (${upcomingCount})`, icon: CalendarDays },
              { id: "live", label: `Live (${liveCount})`, icon: Radio },
              { id: "concluded", label: `Concluded (${concludedCount})`, icon: CheckCircle2 },
            ].map((tab) => {
              const isSelected = statusTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id as any)}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap border transition-all cursor-pointer"
                  style={
                    isSelected
                      ? {
                          background: tab.id === "live"
                            ? "linear-gradient(135deg, #ef4444, #dc2626)"
                            : `linear-gradient(135deg, var(--accent), var(--accent2))`,
                          borderColor: "transparent",
                          color: "#ffffff",
                          boxShadow: tab.id === "live"
                            ? "0 4px 14px -4px rgba(239, 68, 68, 0.6)"
                            : "0 4px 14px -4px var(--accent)",
                        }
                      : {
                          background: "var(--input)",
                          borderColor: "var(--border)",
                          color: "var(--muted)",
                        }
                  }
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.id === "live" && isSelected ? "animate-pulse" : ""}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Relationship Role Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-medium hidden md:inline" style={{ color: "var(--subtle)" }}>
              ROLE:
            </span>
            {[
              { id: "all", label: "All Roles" },
              { id: "Admin", label: "Admin" },
              { id: "Staff", label: "Staff" },
              { id: "Participant", label: "Participant" },
            ].map((rf) => {
              const isSelected = roleFilter === rf.id;
              return (
                <button
                  key={rf.id}
                  onClick={() => setRoleFilter(rf.id as any)}
                  className="h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer"
                  style={
                    isSelected
                      ? { background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" }
                      : { background: "var(--input)", color: "var(--muted)", borderColor: "var(--border)" }
                  }
                >
                  {rf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* EVENTS GRID */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse mt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[340px] rounded-[22px] border"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
              {filteredEvents.slice(0, visibleCount).map((ev) => (
                <EventCard
                  key={ev.id}
                  id={ev.id}
                  title={ev.title}
                  category={ev.category}
                  mode={ev.mode}
                  date={ev.date}
                  endDate={ev.endDate}
                  location={ev.location}
                  city={ev.city}
                  fee={ev.fee}
                  reg={ev.reg}
                  cap={ev.cap}
                  pct={ev.pct}
                  regLabel={ev.regLabel}
                  photo={ev.photo}
                  bannerUrl={ev.bannerUrl}
                  relationshipBadge={ev.relationship}
                  staffRoleName={ev.staffRoleName}
                  statusBadge={ev.isLive ? "live" : ev.isConcluded ? "concluded" : "upcoming"}
                  href={ev.targetHref}
                  isSaved={!!savedIds[ev.id]}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>

            {/* Pagination / Show More */}
            {filteredEvents.length > visibleCount && (
              <div className="flex flex-col items-center gap-2 mt-8">
                <button
                  onClick={() => setVisibleCount((c) => c + 12)}
                  className="h-10 px-6 rounded-full border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Show More Events</span>
                </button>
                <span className="text-xs font-mono" style={{ color: "var(--subtle)" }}>
                  Showing {visibleCount} of {filteredEvents.length} events
                </span>
              </div>
            )}
          </>
        ) : (
          /* EMPTY STATE */
          <div
            className="p-12 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center gap-3 mt-4"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: `color-mix(in oklab, var(--accent) 15%, transparent)`,
                color: "var(--accent)",
              }}
            >
              <CalendarX className="w-7 h-7" />
            </div>
            <h4 className="font-bricolage text-xl font-bold" style={{ color: "var(--text)" }}>
              No Events Found
            </h4>
            <p className="text-sm max-w-md" style={{ color: "var(--muted)" }}>
              {statusTab === "live"
                ? "You don't have any events currently in progress."
                : statusTab === "concluded"
                ? "No completed events recorded in your profile archive."
                : roleFilter !== "all"
                ? `You don't have any events with role "${roleFilter}".`
                : "You haven't joined or created any events yet. Explore open events in the community to get started."}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full text-white text-xs sm:text-sm font-semibold shadow-md hover:scale-105 active:scale-95 transition-transform"
                style={{
                  background: `linear-gradient(135deg, var(--accent), var(--accent2))`,
                  boxShadow: "0 4px 14px -4px var(--accent)",
                }}
              >
                <Compass className="w-4 h-4" />
                <span>Discover Events</span>
              </Link>
              {(statusTab !== "all" || roleFilter !== "all") && (
                <button
                  onClick={() => {
                    setStatusTab("all");
                    setRoleFilter("all");
                  }}
                  className="h-10 px-4 rounded-full border text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
