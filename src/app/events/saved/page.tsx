"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Bookmark,
  ChevronDown,
  CalendarX,
  Compass,
  MapPin,
  Filter,
} from "lucide-react";

import { eventService } from "@/services/event.service";
import AppLayout from "@/components/layout/AppLayout";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import EventCard from "@/components/events/EventCard";

interface SavedEventItem {
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
  is_saved: boolean;
}

export default function SavedEventsPage() {
  const { isDark, activeAccent } = useAppearance();
  const [events, setEvents] = useState<SavedEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const [filterMode, setFilterMode] = useState<"all" | "In-person" | "Online" | "Hybrid">("all");

  useEffect(() => {
    const fetchSavedEvents = async () => {
      setIsLoading(true);
      try {
        const response = await eventService.getSavedEvents({ limit: 100 });
        let rawEvents: any[] = [];
        if (Array.isArray(response)) {
          rawEvents = response;
        } else if (response?.data && Array.isArray(response.data)) {
          rawEvents = response.data;
        } else if (response?.events && Array.isArray(response.events)) {
          rawEvents = response.events;
        } else if (response?.data?.events && Array.isArray(response.data.events)) {
          rawEvents = response.data.events;
        }

        const mapped: SavedEventItem[] = rawEvents.map((evt: any) => {
          const cap = Number(evt.capacity || 200);
          const reg = Number(evt.registered_count ?? evt.registrations_count ?? evt._count?.registrations ?? 0);
          const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
          return {
            id: String(evt.id),
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
            is_saved: true,
          };
        });

        setEvents(mapped);
      } catch (err) {
        console.error("Failed to fetch saved events:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedEvents();
  }, []);

  const handleToggleSave = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetEvent = events.find((ev) => ev.id === id);
    // Optimistic removal
    setEvents((prev) => prev.filter((ev) => ev.id !== id));

    try {
      await eventService.unsaveEvent(id);
      // Update local storage cache
      try {
        const stored = localStorage.getItem("cc_saved_events");
        if (stored) {
          const parsed = JSON.parse(stored);
          delete parsed[id];
          localStorage.setItem("cc_saved_events", JSON.stringify(parsed));
        }
      } catch (e) {}
    } catch (err) {
      console.error("Failed to unsave event:", err);
      // Revert if failed
      if (targetEvent) {
        setEvents((prev) => [...prev, targetEvent]);
      }
    }
  };

  const filteredEvents = useMemo(() => {
    if (filterMode === "all") return events;
    return events.filter((e) => e.mode?.toLowerCase() === filterMode.toLowerCase());
  }, [events, filterMode]);

  return (
    <AppLayout>
      <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-8 py-7 pb-20 flex flex-col gap-6 animate-ccin">
        {/* HEADER */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold" style={{ color: "var(--subtle)" }}>
            <span>WORKSPACE</span>
            <span>/</span>
            <span>BOOKMARKS</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-bricolage text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                Saved Events
              </h1>
              <p className="text-sm sm:text-base max-w-xl leading-relaxed mt-1" style={{ color: "var(--muted)" }}>
                Keep track of all the meetups, hackathons, and conferences you have bookmarked for later.
              </p>
            </div>

            {/* Filter Pills */}
            {events.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {[
                  { id: "all", label: `All (${events.length})` },
                  { id: "In-person", label: "In-Person" },
                  { id: "Online", label: "Online" },
                  { id: "Hybrid", label: "Hybrid" },
                ].map((tab) => {
                  const isSelected = filterMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setFilterMode(tab.id as any)}
                      className="h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer"
                      style={
                        isSelected
                          ? { background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" }
                          : { background: "var(--input)", color: "var(--muted)", borderColor: "var(--border)" }
                      }
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
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
              {filteredEvents.slice(0, visibleCount).map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  category={event.category}
                  mode={event.mode}
                  date={event.date}
                  endDate={event.endDate}
                  location={event.location}
                  city={event.city}
                  fee={event.fee}
                  reg={event.reg}
                  cap={event.cap}
                  pct={event.pct}
                  regLabel={event.regLabel}
                  photo={event.photo}
                  bannerUrl={event.bannerUrl}
                  isSaved={true}
                  onToggleSave={handleToggleSave}
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
              <Bookmark className="w-7 h-7" />
            </div>
            <h4 className="font-bricolage text-xl font-bold" style={{ color: "var(--text)" }}>
              {filterMode !== "all" ? `No ${filterMode} Saved Events` : "No Saved Events"}
            </h4>
            <p className="text-sm max-w-md" style={{ color: "var(--muted)" }}>
              {filterMode !== "all"
                ? `You don't have any saved events with the "${filterMode}" format.`
                : "You haven't bookmarked any events yet. Explore open hackathons, meetups, and conferences to save them for later."}
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
              {filterMode !== "all" && (
                <button
                  onClick={() => setFilterMode("all")}
                  className="h-10 px-4 rounded-full border text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
