"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  ChevronDown,
  Compass,
} from "lucide-react";

import { eventService } from "@/services/event.service";
import AppLayout from "@/components/layout/AppLayout";
import EventCard from "@/components/events/EventCard";
import { formatEventFee, getRawEventFee } from "@/lib/feeUtils";

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
  isRegistrationOpen?: boolean;
}

interface RawSavedEvent {
  id: string | number;
  title?: string;
  type?: { name?: string } | string;
  category?: string;
  mode?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_registration_open?: boolean;
  location?: string | null;
  city?: string | null;
  capacity?: number | string | null;
  registered_count?: number | string | null;
  registrations_count?: number | string | null;
  _count?: { registrations?: number };
  banner_url?: string | null;
  registration_fee?: unknown;
  ticket_price?: unknown;
  fee?: unknown;
}

export default function SavedEventsPage() {
  const [events, setEvents] = useState<SavedEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const fetchSavedEvents = async () => {
      setIsLoading(true);
      try {
        const response = await eventService.getSavedEvents({ limit: 100 });
        let rawEvents: RawSavedEvent[] = [];
        if (Array.isArray(response)) {
          rawEvents = response;
        } else if (response?.data && Array.isArray(response.data)) {
          rawEvents = response.data;
        } else if (response?.events && Array.isArray(response.events)) {
          rawEvents = response.events;
        } else if (response?.data?.events && Array.isArray(response.data.events)) {
          rawEvents = response.data.events;
        }

        const mapped: SavedEventItem[] = rawEvents.map((evt) => {
          const cap = Number(evt.capacity || 200);
          const reg = Number(evt.registered_count ?? evt.registrations_count ?? evt._count?.registrations ?? 0);
          const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
          const eventType = typeof evt.type === "string" ? evt.type : evt.type?.name;
          return {
            id: String(evt.id),
            title: evt.title || "Untitled Event",
            category: eventType || evt.category || "Hackathon",
            mode: evt.mode || "In-person",
            date: evt.start_date
              ? new Date(evt.start_date).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
              : "Coming Soon",
            endDate: evt.end_date || null,
            isRegistrationOpen: evt.is_registration_open !== false,
            location: evt.location || "TBA",
            city: evt.city || evt.location?.split(/[,•·-]/)[0]?.trim() || "TBA",
            fee: formatEventFee(getRawEventFee(evt)),
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
      } catch { }
    } catch (err) {
      console.error("Failed to unsave event:", err);
      // Revert if failed
      if (targetEvent) {
        setEvents((prev) => [...prev, targetEvent]);
      }
    }
  };

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
        ) : events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
              {events.slice(0, visibleCount).map((event) => (
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
                  isRegistrationOpen={event.isRegistrationOpen}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>

            {/* Pagination / Show More */}
            {events.length > visibleCount && (
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
                  Showing {visibleCount} of {events.length} events
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
              No Saved Events
            </h4>
            <p className="text-sm max-w-md" style={{ color: "var(--muted)" }}>
              You haven&apos;t bookmarked any events yet. Explore open hackathons, meetups, and conferences to save them for later.
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
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
