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
  Tag,
  Users,
  Settings as SettingsIcon,
  Zap,
  Code2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  CheckCircle2,
  Bookmark
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eventService } from "@/services/event.service";
import { profileService } from "@/services/profile.service";
import Sidebar from "@/app/home/SideBar";
import AppLayout from "@/components/layout/AppLayout";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import ProfilePromptPopup from "@/components/ProfilePromptPopup";
import NotificationPromptPopup from "@/components/NotificationPromptPopup";

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
  tags?: string[];
  is_saved?: boolean;
}

interface UserPreferences {
  favoriteCategories: string[];
  preferredCities: string[];
  defaultCity?: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteCategories: ["Technical Conferences", "Hackathons and Competitions"],
  preferredCities: [],
  defaultCity: "Global",
};

const BASE_TOPICS_POOL = [
  "Salesforce",
  "Web Dev",
  "React",
  "AI & ML",
  "Python",
  "Cloud",
  "Hackathon",
  "TypeScript",
  "Cybersecurity",
  "UI/UX",
  "DevOps",
  "Mobile",
  "Web3",
  "Next.js",
  "Data Science",
  "Backend",
];

const STANDARD_CATEGORIES_POOL = [
  "Technical Conferences",
  "Hackathons and Competitions",
  "Tech & AI",
  "Meetups",
  "Workshops",
  "Web Development",
  "Open Source",
  "Corporate Events",
  "Exhibitions and Trade Shows",
  "Academic and Training Events",
  "Community and Nonprofit Events",
  "Hybrid and Virtual Events",
];

export default function DiscoverContent() {
  const { isDark, activeAccent } = useAppearance();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("matched");
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [userProfileLocation, setUserProfileLocation] = useState<string>("");

  // In-Place Recommendation Customizer States
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [isSavingCustomization, setIsSavingCustomization] = useState(false);
  const [customizationSaveMsg, setCustomizationSaveMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Load user profile, skills, and preferences from backend & localStorage
  useEffect(() => {
    const loadUserData = async () => {
      // Fast cache load
      try {
        const storedSettings = localStorage.getItem("cc_user_settings");
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          setPreferences({
            favoriteCategories:
              Array.isArray(parsed.favoriteCategories) && parsed.favoriteCategories.length > 0
                ? parsed.favoriteCategories
                : DEFAULT_PREFERENCES.favoriteCategories,
            preferredCities: Array.isArray(parsed.preferredCities) ? parsed.preferredCities : DEFAULT_PREFERENCES.preferredCities,
          });
        }
      } catch { }

      // Fetch fresh authenticated profile & settings
      try {
        const [profile, backendSettings] = await Promise.allSettled([
          profileService.getMyProfile(),
          profileService.getMySettings(),
        ]);

        if (profile.status === "fulfilled" && profile.value) {
          const profData = profile.value;
          if (Array.isArray(profData.skills)) {
            setUserSkills(profData.skills);
          }
          if (profData.location) {
            setUserProfileLocation(profData.location);
            setCityInput(profData.location);
          }
        }

        if (backendSettings.status === "fulfilled" && backendSettings.value) {
          const setts = backendSettings.value;
          const newFavs =
            Array.isArray(setts.favoriteCategories) && setts.favoriteCategories.length > 0
              ? setts.favoriteCategories
              : DEFAULT_PREFERENCES.favoriteCategories;
          const newCities = Array.isArray((setts as any).preferredCities) ? (setts as any).preferredCities : DEFAULT_PREFERENCES.preferredCities;
          const newCity =
            setts.defaultCity ||
            (profile.status === "fulfilled" ? profile.value?.location : null) ||
            DEFAULT_PREFERENCES.defaultCity;

          setPreferences({
            favoriteCategories: newFavs,
            preferredCities: newCities,
            defaultCity: newCity,
          });
          if (!cityInput && newCity) setCityInput(newCity);
        }
      } catch (err) {
        console.warn("Discover: Using cached preferences", err);
      }
    };

    loadUserData();
  }, []);

  // 2. Fetch live events feed with session tags
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
          tags: Array.isArray(evt.tags) ? evt.tags : [],
          is_saved: evt.is_saved || false,
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

  // 3. Dynamic Categories extracted from live events + standard categories
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>(STANDARD_CATEGORIES_POOL);
    events.forEach((e) => {
      if (e.category && e.category.trim()) {
        cats.add(e.category.trim());
      }
    });
    return Array.from(cats);
  }, [events]);

  const handleToggleSave = async (e: React.MouseEvent, eventId: string, currentSavedState: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic UI update
    setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, is_saved: !currentSavedState } : ev));

    try {
      if (currentSavedState) {
        await eventService.unsaveEvent(eventId);
      } else {
        await eventService.saveEvent(eventId);
      }
    } catch (err) {
      console.error("Failed to toggle save event:", err);
      // Revert on failure
      setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, is_saved: currentSavedState } : ev));
    }
  };
  const scoredEvents = useMemo(() => {
    const effectiveCity = userProfileLocation || preferences.defaultCity || "";
    const userCityParts = [
      ...(preferences.preferredCities || []).flatMap(city => city.toLowerCase().split(/[\s,]+/)),
      ...effectiveCity.toLowerCase().split(/[\s,]+/)
    ].filter((p) => p.length > 2);

    return events.map((event) => {
      // A. Category Matching
      const eventCat = (event.category || "").toLowerCase();
      const isCatMatch = preferences.favoriteCategories.some(
        (fav) =>
          eventCat.includes(fav.toLowerCase()) ||
          fav.toLowerCase().includes(eventCat) ||
          (fav.toLowerCase() === "other" &&
            ![
              "technical conferences",
              "hackathons and competitions",
              "corporate events",
              "exhibitions and trade shows",
              "academic and training events",
              "community and nonprofit events",
              "sports and recreational events",
              "hybrid and virtual events",
            ].includes(eventCat))
      );

      // B. Location / City Matching
      const eventLoc = (event.location || "").toLowerCase();
      const isOnline =
        event.mode?.toLowerCase() === "online" ||
        eventLoc.includes("online") ||
        eventLoc.includes("virtual");
      const isCityMatch = isOnline || userCityParts.some((part) => eventLoc.includes(part));

      // C. Skill & Session Tag Matching
      const matchingSkills: string[] = [];
      const allEventTags = (event.tags || []).map((t) => t.toLowerCase());
      const eventText = `${event.title} ${event.description || ""}`.toLowerCase();

      userSkills.forEach((skill) => {
        const sLower = skill.toLowerCase().trim();
        if (!sLower) return;

        const isTagMatch = allEventTags.some(
          (t) => t === sLower || t.includes(sLower) || sLower.includes(t)
        );
        const isTextMatch = eventText.includes(sLower);

        if (isTagMatch || isTextMatch) {
          matchingSkills.push(skill);
        }
      });

      const isSkillMatch = matchingSkills.length > 0;

      // Calculate Total Recommendation Score
      let score = 0;
      if (isSkillMatch) score += 3; // Highest priority: skills match
      if (isCatMatch) score += 2;   // Favorite category match
      if (isCityMatch) score += 1;  // Location / Online match

      return {
        ...event,
        isCategoryMatch: isCatMatch,
        isCityMatch: isCityMatch,
        isSkillMatch: isSkillMatch,
        matchedSkills: matchingSkills,
        matchScore: score,
      };
    });
  }, [events, preferences, userSkills, userProfileLocation]);

  // 6. Reactive Filtering & Sorting Engine
  const filteredEvents = useMemo(() => {
    return scoredEvents
      .filter((evt) => {
        // Multi-keyword token search filter
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
            ...(evt.tags || []),
          ]
            .join(" ")
            .toLowerCase();

          const matchesAllKeywords = queryTokens.every((token) =>
            eventCorpus.includes(token)
          );

          if (!matchesAllKeywords) return false;
        }

        // Filter Pills
        if (activeFilter === "matched") {
          return evt.matchScore > 0;
        } else if (activeFilter === "all") {
          return true;
        } else if (activeFilter === "skills") {
          return evt.isSkillMatch;
        } else {
          return (
            evt.category.toLowerCase().includes(activeFilter.toLowerCase()) ||
            (evt.tags || []).some((t) => t.toLowerCase() === activeFilter.toLowerCase())
          );
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [scoredEvents, searchQuery, activeFilter]);

  // --- IN-PLACE CUSTOMIZATION ACTIONS ---
  const handleAddSkill = async (newSkill: string) => {
    const trimmed = newSkill.trim().replace(/^#/, "");
    if (!trimmed) return;
    if (userSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillInput("");
      return;
    }
    const updatedSkills = [...userSkills, trimmed];
    setUserSkills(updatedSkills);
    setSkillInput("");

    try {
      setIsSavingCustomization(true);
      await profileService.updateMyProfile({ skills: updatedSkills });
      setCustomizationSaveMsg("Skills saved!");
      setTimeout(() => setCustomizationSaveMsg(""), 2000);
    } catch (err) {
      console.error("Failed to save skill update:", err);
    } finally {
      setIsSavingCustomization(false);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    const updatedSkills = userSkills.filter((s) => s !== skillToRemove);
    setUserSkills(updatedSkills);

    try {
      setIsSavingCustomization(true);
      await profileService.updateMyProfile({ skills: updatedSkills });
      setCustomizationSaveMsg("Skill removed!");
      setTimeout(() => setCustomizationSaveMsg(""), 2000);
    } catch (err) {
      console.error("Failed to remove skill:", err);
    } finally {
      setIsSavingCustomization(false);
    }
  };

  const handleToggleCategory = async (cat: string) => {
    let updatedCats: string[];
    if (preferences.favoriteCategories.includes(cat)) {
      updatedCats = preferences.favoriteCategories.filter((c) => c !== cat);
    } else {
      updatedCats = [...preferences.favoriteCategories, cat];
    }

    const updatedPrefs = { ...preferences, favoriteCategories: updatedCats };
    setPreferences(updatedPrefs);
    localStorage.setItem("cc_user_settings", JSON.stringify(updatedPrefs));

    try {
      setIsSavingCustomization(true);
      await profileService.updateMySettings({ favoriteCategories: updatedCats });
      setCustomizationSaveMsg("Preferences saved!");
      setTimeout(() => setCustomizationSaveMsg(""), 2000);
    } catch (err) {
      console.error("Failed to update categories:", err);
    } finally {
      setIsSavingCustomization(false);
    }
  };

  const handleSaveCity = async (newCity: string) => {
    const trimmed = newCity.trim();
    if (!trimmed) return;
    const updatedPrefs = { ...preferences, defaultCity: trimmed };
    setPreferences(updatedPrefs);
    setUserProfileLocation(trimmed);
    localStorage.setItem("cc_user_settings", JSON.stringify(updatedPrefs));

    try {
      setIsSavingCustomization(true);
      await Promise.allSettled([
        profileService.updateMySettings({ defaultCity: trimmed }),
        profileService.updateMyProfile({ location: trimmed }),
      ]);
      setCustomizationSaveMsg("Location saved!");
      setTimeout(() => setCustomizationSaveMsg(""), 2000);
    } catch (err) {
      console.error("Failed to update location:", err);
    } finally {
      setIsSavingCustomization(false);
    }
  };

  // Extract clean keywords for a specific event card
  const extractCardTags = (evt: AppEvent): string[] => {
    const found: string[] = [];

    if (evt.tags && Array.isArray(evt.tags) && evt.tags.length > 0) {
      for (const t of evt.tags) {
        const clean = t.trim();
        if (clean && !found.some((x) => x.toLowerCase() === clean.toLowerCase())) {
          found.push(clean);
        }
      }
    }

    if (evt.keywords && evt.keywords.trim()) {
      const orgTags = evt.keywords
        .split(/[\s,]+/)
        .map((t) => t.replace(/#/g, "").trim())
        .filter((t) => t.length > 1);
      for (const t of orgTags) {
        if (!found.some((x) => x.toLowerCase() === t.toLowerCase())) found.push(t);
      }
    }

    if (found.length === 0 && evt.category) {
      found.push(evt.category.split(/[\s-]+/)[0]);
    }

    return found.slice(0, 6);
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
      } transition-colors duration-300 relative`}
    >
      <AppLayout>
        <div className="flex-1 relative overflow-hidden pb-20 min-w-0">
          {/* Background Ambient Glow */}
          <div
            className={`fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${
              isDark
                ? "from-indigo-950/30 via-zinc-950 to-zinc-950"
                : "from-indigo-100/40 via-zinc-50 to-zinc-50"
            } pointer-events-none`}
          />

          {/* Main Discover Content */}
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 w-full min-w-0 overflow-x-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${activeAccent.badgeBg} border ${activeAccent.border}/20 ${activeAccent.text} text-[10px] sm:text-xs font-semibold mb-3`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized Event Discovery &amp; Agenda Match</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Discover Events
            </h1>
            <p
              className={`text-sm sm:text-base ${isDark ? "text-zinc-400" : "text-zinc-600"
                } mt-1 max-w-xl`}
            >
              Explore meetups, hackathons, and conferences matched dynamically to your profile skills, categories, and location.
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tag, topic, or city..."
              className={`pl-10 rounded-2xl h-11 text-sm font-medium ${
                isDark
                  ? "bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-700"
                  : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300"
              } shadow-xs`}
            />
          </div>
        </div>

        {/* --- SMART RECOMMENDATION PROFILE CARD (SIMPLE & ADJACENT UI) --- */}
        <div
          className={`rounded-3xl border mb-8 transition-all duration-300 overflow-hidden ${
            isDark
              ? "bg-zinc-900/80 border-zinc-800 shadow-xl"
              : "bg-white border-zinc-200 shadow-sm"
          }`}
        >
          {/* Top Summary Header */}
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                <div className={`p-1.5 rounded-lg ${activeAccent.badgeBg} ${activeAccent.text}`}>
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <span className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-950"}`}>
                  Active Filters &amp; Skills
                </span>
                {isSavingCustomization && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 dark:text-indigo-400 normal-case ml-2 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                  </span>
                )}
                {customizationSaveMsg && (
                  <span className={`flex items-center gap-1 text-[11px] font-bold normal-case ml-2 animate-in fade-in ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> {customizationSaveMsg}
                  </span>
                )}
              </div>

              {/* Badges / Chips Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Location Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                    isDark
                      ? "bg-zinc-800 border border-zinc-700 text-zinc-100"
                      : "bg-zinc-100 border border-zinc-300 text-zinc-900"
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${activeAccent.text}`} />
                  <span>{userProfileLocation || preferences.defaultCity}</span>
                </span>

                {/* User Profile Skills Badges */}
                {userSkills.map((skill) => (
                  <span
                    key={skill}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                      isDark
                        ? `${activeAccent.badgeBg} border border-indigo-700/60 text-indigo-200`
                        : "bg-indigo-50 border border-indigo-300 text-indigo-950"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 shrink-0 opacity-90" />
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSkill(skill);
                      }}
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ml-0.5 ${
                        isDark ? "hover:bg-white/15 text-indigo-200" : "hover:bg-indigo-200 text-indigo-900"
                      }`}
                      title={`Remove ${skill}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}

                {/* Favorite Categories Badges */}
                {preferences.favoriteCategories.map((cat) => (
                  <span
                    key={cat}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                      isDark
                        ? "bg-zinc-800 border border-zinc-700 text-zinc-100"
                        : "bg-zinc-100 border border-zinc-300 text-zinc-900"
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5 opacity-70" />
                    <span>{cat}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Toggle Customize Button */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                type="button"
                onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
                className={`w-full sm:w-auto rounded-2xl font-extrabold text-xs px-4 py-2.5 flex items-center justify-center sm:justify-start gap-2 transition-all cursor-pointer ${
                  isCustomizerOpen
                    ? isDark
                      ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                      : "bg-zinc-200 hover:bg-zinc-300 text-zinc-900 border border-zinc-300"
                    : `bg-gradient-to-r ${activeAccent.gradient} text-white shadow-sm`
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isCustomizerOpen ? "Close Controls" : "Customize Filters"}</span>
                {isCustomizerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Unified, High-Contrast In-Place Customizer Drawer */}
          <AnimatePresence>
            {isCustomizerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className={`border-t p-5 sm:p-7 space-y-6 ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950/70"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Technical Skills (7 cols) */}
                  <div
                    className={`lg:col-span-7 rounded-2xl p-5 border space-y-4 shadow-xs ${
                      isDark
                        ? "bg-zinc-900/90 border-zinc-800"
                        : "bg-white border-zinc-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className={`p-1.5 rounded-lg ${isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}>
                          <Code2 className="w-4 h-4" />
                        </div>
                        <h4 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-950"} tracking-tight`}>
                          Technical Skills &amp; Focus Areas
                        </h4>
                      </div>
                      <p className={`text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"} ml-8`}>
                        Events with matching session agenda topics will be prioritized and highlighted.
                      </p>
                    </div>

                    {/* Skill Input Form */}
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            handleAddSkill(skillInput);
                          }
                        }}
                        placeholder="Add skill (e.g. React, Salesforce, Python, AI/ML)..."
                        className={`rounded-xl text-xs font-bold ${
                          isDark
                            ? "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-400"
                            : "bg-zinc-50 border-zinc-300 text-zinc-950 placeholder:text-zinc-500"
                        }`}
                      />
                      <Button
                        type="button"
                        onClick={() => handleAddSkill(skillInput)}
                        disabled={!skillInput.trim()}
                        className={`rounded-xl font-bold text-xs px-3 sm:px-4 shrink-0 bg-gradient-to-r ${activeAccent.gradient} text-white cursor-pointer flex items-center justify-center`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline ml-1">Add Skill</span>
                      </Button>
                    </div>

                    {/* Quick Suggested Skills Pool */}
                    <div className={`space-y-2 pt-2 border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                      <span className={`text-xs font-extrabold uppercase tracking-wide ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                        Popular Suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {BASE_TOPICS_POOL.filter(
                          (t) => !userSkills.some((s) => s.toLowerCase() === t.toLowerCase())
                        ).slice(0, 10).map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => handleAddSkill(topic)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isDark
                                ? "bg-zinc-800/90 border-zinc-700 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-750"
                                : "bg-zinc-100 border-zinc-300 text-zinc-900 hover:border-zinc-400 hover:bg-zinc-200"
                            }`}
                          >
                            <Plus className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                            <span>{topic}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Location Focus (5 cols) */}
                  <div
                    className={`lg:col-span-5 rounded-2xl p-5 border space-y-4 shadow-xs ${
                      isDark
                        ? "bg-zinc-900/90 border-zinc-800"
                        : "bg-white border-zinc-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className={`p-1.5 rounded-lg ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <h4 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-950"} tracking-tight`}>
                          Preferred City &amp; Region
                        </h4>
                      </div>
                      <p className={`text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"} ml-8`}>
                        Events in this location or online will be ranked higher for you.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveCity(cityInput);
                          }
                        }}
                        placeholder="e.g. San Francisco, CA / Bengaluru / Global"
                        className={`rounded-xl text-xs font-bold ${
                          isDark
                            ? "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-400"
                            : "bg-zinc-50 border-zinc-300 text-zinc-950 placeholder:text-zinc-500"
                        }`}
                      />
                      <Button
                        type="button"
                        onClick={() => handleSaveCity(cityInput)}
                        disabled={!cityInput.trim() || cityInput === preferences.defaultCity}
                        className={`rounded-xl font-bold text-xs px-4 shrink-0 bg-gradient-to-r ${activeAccent.gradient} text-white cursor-pointer`}
                      >
                        Save
                      </Button>
                    </div>

                    <div className={`space-y-2 pt-2 border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                      <span className={`text-xs font-extrabold uppercase tracking-wide ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                        Popular Locations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {["Global", "San Francisco, CA", "Bengaluru, India", "New York, NY", "London, UK"].map(
                          (preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setCityInput(preset);
                                handleSaveCity(preset);
                              }}
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                preferences.defaultCity === preset
                                  ? `bg-gradient-to-r ${activeAccent.gradient} text-white border-transparent shadow-xs`
                                  : isDark
                                  ? "bg-zinc-800 border-zinc-700 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-750"
                                  : "bg-zinc-100 border-zinc-300 text-zinc-900 hover:border-zinc-400 hover:bg-zinc-200"
                              }`}
                            >
                              {preset}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Favorite Categories (Full Width) */}
                <div
                  className={`rounded-2xl p-5 border space-y-4 shadow-xs ${
                    isDark
                      ? "bg-zinc-900/90 border-zinc-800"
                      : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"}`}>
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-950"} tracking-tight`}>
                          Favorite Event Categories
                        </h4>
                        <p className={`text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"} mt-0.5`}>
                          Toggle categories to prioritize them in your recommendations.
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ml-8 sm:ml-0 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                      Click to toggle on / off
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {dynamicCategories.map((cat) => {
                      const isFav = preferences.favoriteCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border ${
                            isFav
                              ? `bg-gradient-to-r ${activeAccent.gradient} text-white border-transparent shadow-xs`
                              : isDark
                              ? "bg-zinc-800/90 border-zinc-700 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-750"
                              : "bg-zinc-100 border-zinc-300 text-zinc-900 hover:border-zinc-400 hover:bg-zinc-200"
                          }`}
                        >
                          {isFav ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 shrink-0 opacity-60" />
                          )}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          {/* Matched Pill */}
          <button
            type="button"
            onClick={() => setActiveFilter("matched")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${activeFilter === "matched"
                ? `bg-gradient-to-r ${activeAccent.gradient} text-white shadow-md ${activeAccent.shadow}`
                : isDark
                  ? "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>★ Recommended For You</span>
          </button>

          {/* Skill Matches Pill */}
          {userSkills.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter("skills")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer border ${activeFilter === "skills"
                  ? `bg-gradient-to-r ${activeAccent.gradient} text-white border-transparent shadow-md`
                  : isDark
                    ? `${activeAccent.badgeBg} border-zinc-800 ${activeAccent.text} hover:opacity-90`
                    : `${activeAccent.badgeBg} border-zinc-200 ${activeAccent.text} hover:opacity-90`
                }`}
            >
              <Zap className="w-4 h-4" />
              <span>Skill Matches</span>
            </button>
          )}

          {/* All Events Pill */}
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${activeFilter === "all"
                ? `bg-gradient-to-r ${activeAccent.gradient} text-white shadow-md ${activeAccent.shadow}`
                : isDark
                  ? "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
          >
            <Filter className="w-4 h-4" />
            <span>All Events</span>
          </button>

          {/* Dynamic Live Categories Pills */}
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${activeFilter === cat
                  ? `bg-gradient-to-r ${activeAccent.gradient} text-white shadow-md ${activeAccent.shadow}`
                  : isDark
                    ? "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850"
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
                className="bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 h-[340px] flex flex-col animate-pulse"
              >
                <div className="w-full h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl mb-4" />
                <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4 mb-3" />
                <div className="h-4 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md w-1/2 mb-auto" />
                <div className="flex justify-between items-center mt-4">
                  <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State */
          <div
            className={`p-12 rounded-3xl border text-center my-8 ${isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
              }`}
          >
            <div className={`w-16 h-16 rounded-full ${activeAccent.badgeBg} ${activeAccent.text} flex items-center justify-center mx-auto mb-4`}>
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Events Found in This View</h3>
            <p
              className={`text-sm max-w-md mx-auto mb-6 ${isDark ? "text-zinc-400" : "text-zinc-600"
                }`}
            >
              {activeFilter === "matched"
                ? "No events match your current skills, category, or location preferences yet. Click 'Customize Feed' above to add your skills & categories!"
                : "No events match your current search query or filter selection."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => setActiveFilter("all")}
                className={`rounded-2xl ${activeAccent.bg} hover:opacity-90 text-white font-semibold`}
              >
                View All Events
              </Button>
              <Button
                onClick={() => setIsCustomizerOpen(true)}
                variant="outline"
                className="rounded-2xl font-semibold flex items-center gap-1.5"
              >
                <Code2 className="w-4 h-4" />
                Customize Feed
              </Button>
            </div>
          </div>
        ) : (
          /* Events Grid */
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
              const cardTags = extractCardTags(event);

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <Link href={`/events/${event.id}`}>
                    <div
                      className={`group ${isDark
                          ? "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                          : "bg-white border-zinc-200 hover:border-zinc-300"
                        } rounded-3xl p-3 border transition-all duration-300 hover:shadow-xl cursor-pointer relative overflow-hidden h-full flex flex-col`}
                    >
                      {/* BANNER */}
                      <div
                        className={`w-full h-48 rounded-2xl ${event.bannerUrl ? "bg-zinc-100" : `bg-gradient-to-br ${randomGradient}`
                          } relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-500 ease-out`}
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
                          className={`absolute top-4 left-4 ${isDark ? "bg-zinc-950/80 text-zinc-100 border border-white/10" : "bg-white/90 text-zinc-900 border border-zinc-200/80"
                            } backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold shadow-xs z-10`}
                        >
                          {event.category || "Tech Event"}
                        </div>

                        {/* Recommendation Match Badge - Top Right */}
                        <div className="absolute top-4 right-4 z-10">
                          {event.matchScore >= 4 ? (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold bg-gradient-to-r ${activeAccent.gradient} text-white shadow-md flex items-center gap-1`}>
                              <Sparkles className="w-3 h-3" /> Top Match
                            </span>
                          ) : event.isSkillMatch ? (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeAccent.badgeBg} ${activeAccent.text} border border-current/20 backdrop-blur-md shadow-xs flex items-center gap-1`}>
                              <Zap className="w-3 h-3" /> Skill Match
                            </span>
                          ) : event.isCategoryMatch ? (
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900/80 text-white border border-white/10 backdrop-blur-md shadow-xs flex items-center gap-1`}
                            >
                              🏷️ Category Match
                            </span>
                          ) : event.isCityMatch ? (
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900/80 text-white border border-white/10 backdrop-blur-md shadow-xs flex items-center gap-1">
                              📍 Location Match
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* EVENT DETAILS */}
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
                            onClick={(e) => handleToggleSave(e, event.id, !!event.is_saved)}
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

                        {/* Interactive Session Tag Bubbles */}
                        {cardTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {cardTags.map((tag) => {
                              const isSkillMatch = userSkills.some(
                                (s) =>
                                  s.toLowerCase() === tag.toLowerCase() ||
                                  tag.toLowerCase().includes(s.toLowerCase()) ||
                                  s.toLowerCase().includes(tag.toLowerCase())
                              );

                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSearchQuery(tag);
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${isSkillMatch
                                      ? `${activeAccent.badgeBg} border-current/30 ${activeAccent.text} hover:opacity-80 shadow-2xs`
                                      : isDark
                                        ? "bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 hover:text-white border-zinc-700/60"
                                        : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border-zinc-200"
                                    }`}
                                  title={`Filter events by ${tag}`}
                                >
                                  {isSkillMatch ? (
                                    <Sparkles className="w-2.5 h-2.5" />
                                  ) : (
                                    <Tag className="w-2.5 h-2.5 opacity-60" />
                                  )}
                                  <span>#{tag}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="space-y-2.5 mt-auto border-t border-zinc-100 dark:border-zinc-800 pt-3">
                          {/* DATE */}
                          <div
                            className={`flex items-center text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"
                              } gap-2.5`}
                          >
                            <Calendar className={`w-3.5 h-3.5 ${activeAccent.text}`} />
                            {formatDate(event.date)}
                          </div>

                          {/* LOCATION & MODE */}
                          <div
                            className={`flex items-center text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"
                              } gap-2.5 min-w-0 w-full`}
                          >
                            <MapPin className={`w-3.5 h-3.5 ${activeAccent.text} shrink-0`} />
                            <span className="capitalize truncate flex-1 min-w-0" title={event.location}>{event.location}</span>
                            <span className="text-zinc-400 dark:text-zinc-600 shrink-0">•</span>
                            <span className={`uppercase text-[10px] font-black ${activeAccent.text} shrink-0`}>
                              {event.mode}
                            </span>
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

      {/* Prompts */}
      <ProfilePromptPopup />
      <NotificationPromptPopup />
        </div>
      </AppLayout>
    </div>
  );
}
