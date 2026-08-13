"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Compass,
  Search,
  MapPin,
  Calendar,
  Sparkles,
  Filter,
  SlidersHorizontal,
  ArrowUpRight,
  CheckCircle2,
  Tag,
  Users,
  AlertCircle,
  Settings as SettingsIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eventService } from "@/services/event.service";
import { profileService } from "@/services/profile.service";
import Sidebar from "@/app/home/SideBar";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import ProfilePromptPopup from "@/components/ProfilePromptPopup";

interface AppEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  attendees: number;
  bannerUrl?: string | null;
  description?: string;
  mode?: string;
  keywords?: string;
}

interface UserPreferences {
  favoriteCategories: string[];
  preferredCities: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteCategories: ["Technical Conferences", "Hackathons and Competitions"],
  preferredCities: [],
};

const POPULAR_KEYWORDS = [
  "AI & ML",
  "React",
  "Hackathon",
  "TypeScript",
  "Python",
  "Web3",
  "Cloud",
  "Networking",
  "Design",
  "Startup",
  "Cybersecurity",
  "Virtual",
];

// Dynamically extract keyword tags from event text fields (title, category, description, keywords)
const extractEventKeywords = (evt: AppEvent): string[] => {
  const found: string[] = [];

  // 1) First check organizer-defined keywords
  if (evt.keywords && evt.keywords.trim()) {
    const orgTags = evt.keywords
      .split(/[\s,]+/)
      .map((t) => t.replace(/#/g, "").trim().toLowerCase())
      .filter((t) => t.length > 1);
    found.push(...orgTags);
  }

  // 2) Always include category word if not present
  const catWord = evt.category.toLowerCase().split(/[\s-]+/)[0];
  if (catWord && catWord.length > 2 && !found.includes(catWord)) {
    found.push(catWord);
  }

  // 3) Then auto-extract from title/description if we have fewer than 4 keywords
  const text = `${evt.title} ${evt.description || ""} ${evt.category} ${evt.location}`.toLowerCase();
  const keywordPool = [
    "ai",
    "ml",
    "react",
    "python",
    "hackathon",
    "typescript",
    "nextjs",
    "node",
    "cloud",
    "web3",
    "design",
    "networking",
    "startup",
    "cybersecurity",
    "virtual",
    "workshop",
    "conference",
    "meetup",
    "aws",
    "docker",
  ];

  for (const kw of keywordPool) {
    if (found.length >= 4) break;
    if (text.includes(kw) && !found.includes(kw)) {
      found.push(kw);
    }
  }

  return found.length > 0 ? found.slice(0, 4) : ["community", "event"];
};

export default function DiscoverContent() {
  const { isDark, activeAccent } = useAppearance();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("matched");
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  // Load preferences from localStorage & backend
  useEffect(() => {
    const loadPreferences = async () => {
      // 1. Try local storage first for speed
      try {
        const stored = localStorage.getItem("cc_user_settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({
            favoriteCategories:
              Array.isArray(parsed.favoriteCategories) && parsed.favoriteCategories.length > 0
                ? parsed.favoriteCategories
                : DEFAULT_PREFERENCES.favoriteCategories,
            preferredCities: Array.isArray(parsed.preferredCities) ? parsed.preferredCities : DEFAULT_PREFERENCES.preferredCities,
          });
        }
      } catch {
        // Ignore parse error
      }

      // 2. Fetch fresh settings from backend
      try {
        const backendSettings = await profileService.getMySettings();
        if (backendSettings && typeof backendSettings === "object") {
          const newFavs =
            Array.isArray(backendSettings.favoriteCategories) &&
            backendSettings.favoriteCategories.length > 0
              ? backendSettings.favoriteCategories
              : DEFAULT_PREFERENCES.favoriteCategories;
          const newCities = Array.isArray(backendSettings.preferredCities) ? backendSettings.preferredCities : DEFAULT_PREFERENCES.preferredCities;

          setPreferences({
            favoriteCategories: newFavs,
            preferredCities: newCities,
          });
          // // localStorage.setItem(
          //   "cc_user_settings",
          //   JSON.stringify({ ...backendSettings, favoriteCategories: newFavs, preferredCities: newCities })
          // );
        }
      } catch {
        // Fallback silently if offline or unauthenticated
      }
    };

    loadPreferences();
  }, []);

  // Fetch events feed
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const response = await eventService.getFeed({ limit: 100 });
        let rawEvents: any[] = [];
        if (Array.isArray(response)) {
          rawEvents = response;
        } else if (response?.data && Array.isArray(response.data)) {
          rawEvents = response.data;
        } else if (response?.events && Array.isArray(response.events)) {
          rawEvents = response.events;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          rawEvents = response.data.data;
        } else if (response?.data?.events && Array.isArray(response.data.events)) {
          rawEvents = response.data.events;
        }

        const mapped: AppEvent[] = rawEvents.map((evt: any) => ({
          id: String(evt.id || evt._id || Math.random()),
          title: evt.title || "Untitled Event",
          category: evt.type || evt.category || "General Event",
          date: evt.start_date || evt.date || new Date().toISOString(),
          location: evt.location || evt.mode || "TBA",
          attendees: evt.capacity || evt.attendees || 0,
          bannerUrl: evt.banner_url || evt.bannerUrl || evt.banner || null,
          description: evt.description || "",
          mode: evt.mode || "in-person",
          keywords: evt.custom_fields?.keywords || evt.keywords || "",
        }));

        setEvents(mapped);
      } catch (err) {
        console.error("Failed to fetch discover events:", err);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Calculate preference matches for events
  const scoredEvents = useMemo(() => {
    const userCityParts = preferences.preferredCities
      .flatMap(city => city.toLowerCase().split(/[\s,]+/))
      .filter((p) => p.length > 2);

    return events.map((event) => {
      const eventCat = (event.category || "").toLowerCase();
      const isCatMatch = preferences.favoriteCategories.some(
        (fav) =>
          eventCat.includes(fav.toLowerCase()) ||
          fav.toLowerCase().includes(eventCat) ||
          (fav.toLowerCase() === "other" &&
            !["technical conferences", "hackathons and competitions", "corporate events", "exhibitions and trade shows", "academic and training events", "weddings and personal events", "community and nonprofit events", "sports and recreational events", "government and civic events", "hybrid and virtual events"].includes(eventCat))
      );

      const eventLoc = (event.location || "").toLowerCase();
      const isCityMatch = userCityParts.some((part) => eventLoc.includes(part));

      let score = 0;
      if (isCatMatch) score += 2;
      if (isCityMatch) score += 1;

      return {
        ...event,
        isCategoryMatch: isCatMatch,
        isCityMatch: isCityMatch,
        matchScore: score,
      };
    });
  }, [events, preferences]);

  // Filter & sort events
  const filteredEvents = useMemo(() => {
    return scoredEvents
      .filter((evt) => {
        // Multi-keyword token search filter (searches title, description, category, location, mode)
        if (searchQuery.trim()) {
          const queryTokens = searchQuery
            .toLowerCase()
            .replace(/#/g, "")
            .split(/[\s,]+/)
            .filter((t) => t.length > 0);

          const eventCorpus = [
            evt.title,
            evt.description || "",
            evt.category,
            evt.location,
            evt.mode || "",
            evt.keywords || "",
          ]
            .join(" ")
            .toLowerCase();

          const matchesAllKeywords = queryTokens.every((token) =>
            eventCorpus.includes(token)
          );

          if (!matchesAllKeywords) return false;
        }

        // Pill filter
        if (activeFilter === "matched") {
          return evt.matchScore > 0;
        } else if (activeFilter === "all") {
          return true;
        } else {
          return evt.category.toLowerCase().includes(activeFilter.toLowerCase());
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [scoredEvents, searchQuery, activeFilter]);

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
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row relative">
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900"
      } flex flex-col md:flex-row relative`}
    >
      {/* Background Ambient Glow */}
      <div
        className={`fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${
          isDark
            ? "from-indigo-900/20 via-zinc-950 to-zinc-950"
            : "from-indigo-200/40 via-zinc-50 to-zinc-50"
        } pointer-events-none`}
      />

      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Discover Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${activeAccent.badgeBg} border ${activeAccent.border}/20 ${activeAccent.text} text-xs font-semibold mb-3`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized Event Discovery</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Discover Events
            </h1>
            <p
              className={`text-sm sm:text-base ${
                isDark ? "text-zinc-400" : "text-zinc-600"
              } mt-1 max-w-xl`}
            >
              Explore meetups, hackathons, and conferences matched to your favorite categories and primary location.
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, topic, or city..."
              className={`pl-10 rounded-2xl h-11 text-sm font-medium ${
                isDark
                  ? "bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-500"
                  : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-600"
              } shadow-sm`}
            />
          </div>
        </div>

        {/* Quick Keyword & Topic Search Tags */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
            <Tag className={`w-3.5 h-3.5 ${activeAccent.text}`} />
            Trending Topics:
          </span>
          {POPULAR_KEYWORDS.map((kw) => {
            const isSelected =
              searchQuery.toLowerCase() === kw.toLowerCase() ||
              searchQuery.toLowerCase() === `#${kw.toLowerCase()}`;
            return (
              <button
                key={kw}
                type="button"
                onClick={() =>
                  setSearchQuery(isSelected ? "" : kw)
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? `bg-gradient-to-r ${activeAccent.gradient} text-white border-transparent shadow-md`
                    : isDark
                    ? "bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:border-white/20"
                    : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100"
                }`}
              >
                #{kw}
              </button>
            );
          })}
        </div>

        {/* Your Active Preferences Banner */}
        <div
          className={`p-5 sm:p-6 rounded-3xl border mb-8 backdrop-blur-xl transition-all ${
            isDark
              ? "bg-zinc-900/60 border-white/10 shadow-2xl"
              : "bg-white/80 border-zinc-200 shadow-md"
          } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <SlidersHorizontal className={`w-4 h-4 ${activeAccent.text}`} />
              <span>Matching Based On Your Preferences</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {preferences.preferredCities.map((city) => (
                <span
                  key={city}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold ${
                    isDark
                      ? "bg-zinc-800 border border-white/10 text-zinc-200"
                      : "bg-zinc-100 border border-zinc-300 text-zinc-800"
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${activeAccent.text}`} />
                  {city}
                </span>
              ))}

              {preferences.favoriteCategories.map((cat) => (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-gradient-to-r ${activeAccent.gradient} text-white shadow-sm`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <Link href="/settings?tab=preferences">
            <Button
              variant="outline"
              size="sm"
              className={`rounded-2xl font-semibold text-xs border ${
                isDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  : "border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
              } flex items-center gap-1.5`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              Customize Preferences
            </Button>
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter("matched")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeFilter === "matched"
                ? `bg-gradient-to-r ${activeAccent.gradient} text-white shadow-lg ${activeAccent.shadow}`
                : isDark
                ? "bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Matched For You ({scoredEvents.filter((e) => e.matchScore > 0).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeFilter === "all"
                ? `bg-gradient-to-r ${activeAccent.gradient} text-white shadow-lg ${activeAccent.shadow}`
                : isDark
                ? "bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <span>All Events ({events.length})</span>
          </button>

          {preferences.favoriteCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeFilter === cat
                  ? `bg-gradient-to-r ${activeAccent.gradient} text-white shadow-lg ${activeAccent.shadow}`
                  : isDark
                  ? "bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-zinc-100/60 border border-zinc-200 rounded-[2rem] p-6 h-[340px] flex flex-col animate-pulse"
              >
                <div className="w-full h-40 bg-zinc-200 rounded-2xl mb-4" />
                <div className="h-6 bg-zinc-200 rounded-md w-3/4 mb-3" />
                <div className="h-4 bg-zinc-200/50 rounded-md w-1/2 mb-auto" />
                <div className="flex justify-between items-center mt-4">
                  <div className="h-8 w-24 bg-zinc-200 rounded-xl" />
                  <div className="h-9 w-28 bg-zinc-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State */
          <div
            className={`p-12 rounded-3xl border text-center my-8 ${
              isDark ? "bg-zinc-900/40 border-white/5" : "bg-white border-zinc-200 shadow-sm"
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Events Found in This View</h3>
            <p
              className={`text-sm max-w-md mx-auto mb-6 ${
                isDark ? "text-zinc-400" : "text-zinc-600"
              }`}
            >
              {activeFilter === "matched"
                ? "There are currently no events matching your specific category or location preferences. Try switching to 'All Events' or updating your preferences."
                : "No events match your current search query or filter selection."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => setActiveFilter("all")}
                className={`rounded-2xl ${activeAccent.bg} hover:opacity-90 text-white font-semibold`}
              >
                View All Events ({events.length})
              </Button>
              <Link href="/settings?tab=preferences">
                <Button variant="outline" className="rounded-2xl font-semibold">
                  Update Preferences
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Events Grid (using existing Home card component style) */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-4"
          >
            {filteredEvents.map((event, index) => {
              const gradients = [
                "from-blue-500 to-cyan-400",
                "from-indigo-500 to-purple-600",
                "from-rose-500 to-orange-400",
                "from-emerald-400 to-teal-500",
              ];
              const randomGradient = gradients[index % gradients.length];

              return (
                <motion.div key={event.id}>
                  <Link href={`/events/${event.id}`}>
                    <div
                      className={`group ${
                        isDark
                          ? "bg-zinc-900/60 border-white/10 hover:border-white/20"
                          : "bg-white border-zinc-200 hover:border-indigo-200"
                      } rounded-3xl p-3 border transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden h-full flex flex-col`}
                    >
                      {/* BANNER */}
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

                        {/* Category Badge - Top Left */}
                        <div
                          className={`absolute top-4 left-4 ${
                            isDark ? "bg-zinc-950/80 text-zinc-100" : "bg-white/90 text-zinc-900"
                          } backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10`}
                        >
                          {event.category || "Tech Event"}
                        </div>

                        {/* Preference Match Badge - Top Right */}
                        <div className="absolute top-4 right-4 z-10">
                          {event.matchScore === 3 ? (
                            <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg flex items-center gap-1">
                              ★ Perfect Match
                            </span>
                          ) : event.isCategoryMatch ? (
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${activeAccent.gradient} text-white shadow-md flex items-center gap-1`}
                            >
                              🏷️ Category Match
                            </span>
                          ) : event.isCityMatch ? (
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-600/90 text-white shadow-md flex items-center gap-1">
                              📍 Location Match
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* EVENT DETAILS */}
                      <div className="p-5 flex-1 flex flex-col">
                        <h3
                          className={`text-xl font-bold ${
                            isDark ? "text-white" : "text-zinc-900"
                          } mb-3 group-hover:${activeAccent.text} transition-colors line-clamp-2`}
                        >
                          {event.title}
                        </h3>

                        {/* Extracted Keyword Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {extractEventKeywords(event).map((kw) => (
                            <button
                              key={kw}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSearchQuery(kw);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                isDark
                                  ? "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5"
                                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border border-zinc-200"
                              } transition-colors`}
                            >
                              #{kw}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-3 mt-auto">
                          {/* DATE */}
                          <div className={`flex items-center text-sm font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"} gap-3`}>
                            <Calendar className={`w-4 h-4 ${activeAccent.text}`} />
                            {formatDate(event.date)}
                          </div>

                          {/* LOCATION */}
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

      <ProfilePromptPopup />
    </div>
  );
}
