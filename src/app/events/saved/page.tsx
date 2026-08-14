"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Bookmark,
  Calendar,
  MapPin,
} from "lucide-react";

import { eventService } from "@/services/event.service";
import AppLayout from "@/components/layout/AppLayout";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { Button } from "@/components/ui/button";

interface AppEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  bannerUrl?: string | null;
  is_saved?: boolean;
}

export default function SavedEventsPage() {
  const { isDark, activeAccent } = useAppearance();
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchSavedEvents = async () => {
      setIsLoading(true);
      try {
        const response = await eventService.getSavedEvents({ limit: 100 });
        let rawEvents: any[] = [];
        if (response?.data && Array.isArray(response.data)) {
          rawEvents = response.data;
        } else if (response?.events && Array.isArray(response.events)) {
          rawEvents = response.events;
        } else if (response?.data?.events && Array.isArray(response.data.events)) {
          rawEvents = response.data.events;
        }

        const mapped: AppEvent[] = rawEvents.map((evt: any) => ({
          id: String(evt.id),
          title: evt.title || "Untitled Event",
          category: evt.type || evt.category || "General Event",
          date: evt.start_date || evt.date || new Date().toISOString(),
          location: evt.location || evt.mode || "TBA",
          bannerUrl: evt.banner_url || evt.bannerUrl || evt.banner || null,
          is_saved: evt.is_saved || true, // We know they are saved if they are here
        }));

        setEvents(mapped);
      } catch (err) {
        console.error("Failed to fetch saved events:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedEvents();
  }, []);

  const handleToggleSave = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistically remove from list
    const removedEvent = events.find((ev) => ev.id === eventId);
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));

    try {
      await eventService.unsaveEvent(eventId);
    } catch (err) {
      console.error("Failed to unsave event:", err);
      // Revert on failure
      if (removedEvent) {
        setEvents((prev) => [...prev, removedEvent]);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row relative overflow-x-hidden">
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900"}`}>
      <AppLayout>
        <div
          className={`fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${
            isDark
              ? "from-indigo-900/20 via-zinc-950 to-zinc-950"
              : "from-indigo-200/40 via-zinc-50 to-zinc-50"
          } pointer-events-none`}
        />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${activeAccent.badgeBg} border ${activeAccent.border}/20 ${activeAccent.text} text-xs font-semibold mb-3`}>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Your Bookmarked Events</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Saved Events</h1>
              <p className={`text-sm sm:text-base ${isDark ? "text-zinc-400" : "text-zinc-600"} mt-1 max-w-xl`}>
                Keep track of the meetups, hackathons, and conferences you're interested in attending.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-100/60 border border-zinc-200 rounded-[2rem] p-6 h-[340px] flex flex-col animate-pulse"
                >
                  <div className="w-full h-40 bg-zinc-200 rounded-2xl mb-4" />
                  <div className="h-6 bg-zinc-200 rounded-md w-3/4 mb-3" />
                  <div className="h-4 bg-zinc-200/50 rounded-md w-1/2 mb-auto" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div
              className={`p-12 rounded-3xl border text-center my-8 ${
                isDark ? "bg-zinc-900/40 border-white/5" : "bg-white border-zinc-200 shadow-sm"
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Saved Events</h3>
              <p className={`text-sm max-w-md mx-auto mb-6 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                You haven't saved any events yet. Head over to the Discover page to find events you might be interested in.
              </p>
              <Link href="/discover">
                <Button className={`rounded-2xl ${activeAccent.bg} hover:opacity-90 text-white font-semibold`}>
                  Discover Events
                </Button>
              </Link>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-4"
            >
              {events.map((event, index) => {
                const gradients = [
                  "from-blue-500 to-cyan-400",
                  "from-indigo-500 to-purple-600",
                  "from-rose-500 to-orange-400",
                  "from-emerald-400 to-teal-500",
                ];
                const randomGradient = gradients[index % gradients.length];

                return (
                  <motion.div key={event.id} layout>
                    <Link href={`/events/${event.id}`}>
                      <div
                        className={`group ${
                          isDark
                            ? "bg-zinc-900/60 border-white/10 hover:border-white/20"
                            : "bg-white border-zinc-200 hover:border-indigo-200"
                        } rounded-3xl p-3 border transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden h-full flex flex-col`}
                      >
                        <div
                          className={`w-full h-48 rounded-2xl ${
                            event.bannerUrl ? "bg-zinc-100" : `bg-gradient-to-br ${randomGradient}`
                          } relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 ease-out`}
                        >
                          {event.bannerUrl && (
                            <img
                              src={event.bannerUrl}
                              alt={event.title}
                              className="w-full h-full object-cover absolute inset-0"
                            />
                          )}

                          <div
                            className={`absolute top-4 left-4 ${
                              isDark ? "bg-zinc-950/80 text-zinc-100" : "bg-white/90 text-zinc-900"
                            } backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10`}
                          >
                            {event.category || "Tech Event"}
                          </div>

                          {/* Removed absolute position bookmark from here */}
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3
                              className={`text-xl font-bold ${
                                isDark ? "text-white" : "text-zinc-900"
                              } group-hover:${activeAccent.text} transition-colors line-clamp-2`}
                            >
                              {event.title}
                            </h3>
                            <button
                              onClick={(e) => handleToggleSave(e, event.id)}
                              className={`p-2 shrink-0 rounded-full transition-all ${
                                event.is_saved
                                  ? `bg-gradient-to-r ${activeAccent.gradient} text-white shadow-md`
                                  : isDark
                                  ? "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                                  : "bg-zinc-100 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200"
                              }`}
                            >
                              <Bookmark className={`w-4 h-4 ${event.is_saved ? "fill-current" : ""}`} />
                            </button>
                          </div>

                          <div className="space-y-3 mt-auto">
                            <div className={`flex items-center text-sm font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"} gap-3`}>
                              <Calendar className={`w-4 h-4 ${activeAccent.text}`} />
                              {formatDate(event.date)}
                            </div>
                            <div className={`flex items-center text-sm font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"} gap-3`}>
                              <MapPin className={`w-4 h-4 ${activeAccent.text}`} />
                              {event.location || "TBA"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </main>
      </AppLayout>
    </div>
  );
}
