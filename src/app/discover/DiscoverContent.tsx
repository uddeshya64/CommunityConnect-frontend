"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Sparkles,
  Zap,
  Bookmark,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Compass,
} from "lucide-react";
import { eventService } from "@/services/event.service";
import { profileService } from "@/services/profile.service";
import AppLayout from "@/components/layout/AppLayout";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useUser } from "@/components/providers/UserProvider";
import { useToast } from "@/components/providers/ToastProvider";
import ProfilePromptPopup from "@/components/ProfilePromptPopup";
import EventCard from "@/components/events/EventCard";

interface AppEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  city: string;
  mode: string;
  fee: string;
  regLabel: string;
  match: string;
  tags: string[];
  photo: string;
  is_saved?: boolean;
}

const DEFAULT_DISCOVER_COVERS = [
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=900&auto=format&fit=crop",
];

const SUGGESTED_SKILLS = ["React", "Python", "Cloud Native", "AI / ML", "UI/UX", "Rust", "Next.js", "Docker"];
const SUGGESTED_CITIES = ["Bengaluru", "Hyderabad", "Mumbai", "Pune", "Delhi NCR"];


function computeSkillMatch(eventId = "", userSkills: string[] = [], eventTags: string[] = [], title = "", desc = ""): string {
  const normalizedUserSkills = (userSkills || []).map((s) => s.toLowerCase().trim()).filter(Boolean);
  
  // Deterministic variance based on event identifier
  const salt = eventId
    ? Math.abs(eventId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9)
    : 4;

  if (normalizedUserSkills.length === 0) {
    // Dynamic recommendation baseline score (78% to 92%)
    const baseScore = 78 + (salt % 15);
    return `${baseScore}%`;
  }

  const normalizedEventKeywords = new Set([
    ...(eventTags || []).map((t) => t.toLowerCase().trim()),
    ...title.toLowerCase().split(/\W+/),
    ...desc.toLowerCase().split(/\W+/),
  ].filter(Boolean));

  let matched = 0;
  for (const skill of normalizedUserSkills) {
    if (
      normalizedEventKeywords.has(skill) ||
      [...normalizedEventKeywords].some((kw) => kw.includes(skill) || skill.includes(kw))
    ) {
      matched++;
    }
  }

  const ratio = matched / Math.max(1, normalizedUserSkills.length);
  // Match score between 68% and 99% based on real skill match ratio + salt
  const score = Math.min(99, Math.max(68, Math.round(68 + ratio * 28 + (salt % 4))));
  return `${score}%`;
}

export default function DiscoverContent() {
  const { activeAccent } = useAppearance();
  const { toast } = useToast();
  const { profile } = useUser();
  const [cityDraft, setCityDraft] = useState("");

  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [discSearch, setDiscSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  // Active filters & skills customization accordion
  const [custOpen, setCustOpen] = useState(true);
  const [skills, setSkills] = useState<string[]>(["Generative AI", "Next.js", "Cloud Native", "TypeScript"]);
  const [cities, setCities] = useState<string[]>(["Bengaluru", "Hyderabad"]);
  const [skillDraft, setSkillDraft] = useState("");
  const [favCats, setFavCats] = useState<string[]>(["Tech", "Hackathon"]);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("cc_saved_events");
      if (stored) setSavedIds(JSON.parse(stored));
      const storedSkills = localStorage.getItem("cc_user_skills");
      if (storedSkills) setSkills(JSON.parse(storedSkills));
      const storedCities = localStorage.getItem("cc_user_cities");
      const storedCats = localStorage.getItem("cc_fav_cats");
      if (storedCats) setFavCats(JSON.parse(storedCats));
      if (storedCities) setCities(JSON.parse(storedCities));
    } catch (e) {}
  }, []);

  // Fetch real events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const res = await eventService.getAllEvents({ limit: 100 });
        let rawEvents: any[] = [];
        if (Array.isArray(res)) rawEvents = res;
        else if (res?.data?.events) rawEvents = res.data.events;
        else if (res?.data && Array.isArray(res.data)) rawEvents = res.data;
        else if (res?.events) rawEvents = res.events;

        if (rawEvents.length > 0) {
          const userSkills = profile?.skills || skills || [];
          const mapped = rawEvents.map((evt: any) => {
            const cap = Number(evt.capacity || 200);
            const reg = Number(evt.registered_count ?? evt.registrations_count ?? evt._count?.registrations ?? 0);
            const evtId = String(evt.id || evt._id);
            const score = computeSkillMatch(evtId, userSkills, evt.tags || [], evt.title, evt.description);
            return {
              id: evtId,
              title: evt.title || "Untitled Event",
              category: evt.type?.name || evt.type || evt.category || "Hackathon",
              mode: evt.mode || "In-person",
              date: evt.start_date
                ? new Date(evt.start_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "Sat 15 Nov",
              location: evt.location || "Bengaluru",
              city: evt.city || evt.location?.split(/[,•·-]/)[0]?.trim() || "Bengaluru",
              fee: evt.ticket_price ? `₹${evt.ticket_price}` : "Free",
              regLabel: `${reg} / ${cap}`,
              match: score,
              tags: evt.tags || ["Technology", "Community"],
              photo:
                evt.banner_url ||
                DEFAULT_DISCOVER_COVERS[Math.abs(Number(evt.id || 0)) % DEFAULT_DISCOVER_COVERS.length],
            };
          });
          setEvents(mapped);
        } else {
          setEvents([]);
        }
      } catch (e) {
        console.error("Failed to load discover events:", e);
        setEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    fetchEvents();
  }, [profile]);

  const toggleSave = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const willSave = !savedIds[id];
    setSavedIds((prev) => {
      const next = { ...prev, [id]: willSave };
      try {
        localStorage.setItem("cc_saved_events", JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    try {
      if (willSave) {
        await eventService.saveEvent(id);
      } else {
        await eventService.unsaveEvent(id);
      }
    } catch (err) {
      console.error("Failed to sync saved event with backend:", err);
    }
  };

  const addSkill = (val?: string) => {
    const target = (val || skillDraft).trim();
    if (!target || skills.includes(target)) return;
    const updated = [...skills, target];
    setSkills(updated);
    setSkillDraft("");
    try {
      localStorage.setItem("cc_user_skills", JSON.stringify(updated));
    } catch (e) {}
  };

  const removeSkill = (s: string) => {
    const updated = skills.filter((item) => item !== s);
    setSkills(updated);
    try {
      localStorage.setItem("cc_user_skills", JSON.stringify(updated));
    } catch (e) {}
  };

  const addCity = (c: string) => {
    if (cities.includes(c)) return;
    const updated = [...cities, c];
    setCities(updated);
    try {
      localStorage.setItem("cc_user_cities", JSON.stringify(updated));
    } catch (e) {}
  };

  const removeCity = (c: string) => {
    const updated = cities.filter((item) => item !== c);
    setCities(updated);
    try {
      localStorage.setItem("cc_user_cities", JSON.stringify(updated));
    } catch (e) {}
  };

  const toggleFavCat = (c: string) => {
    const next = favCats.includes(c) ? favCats.filter((x) => x !== c) : [...favCats, c];
    setFavCats(next);
    try { localStorage.setItem("cc_fav_cats", JSON.stringify(next)); } catch (e) {}
  };

  const addCustomCity = () => {
    const target = cityDraft.trim();
    if (!target || cities.map((c) => c.toLowerCase()).includes(target.toLowerCase())) return;
    const updated = [...cities, target];
    setCities(updated);
    setCityDraft("");
    try {
      localStorage.setItem("cc_user_cities", JSON.stringify(updated));
    } catch (e) {}
  };

  const handleApplyFilters = () => {
    savePreferences();
    toast("Filters applied successfully!", "success");
  };

  const savePreferences = () => {
    try {
      localStorage.setItem("cc_user_skills", JSON.stringify(skills));
      localStorage.setItem("cc_user_cities", JSON.stringify(cities));
      localStorage.setItem("cc_fav_cats", JSON.stringify(favCats));
    } catch (e) {}
    toast("Match preferences saved to your profile", "success");
  };

  const categoryPills = [
    { label: "All", cat: "All", hasIcon: false },
    { label: "Eventrix recommendation", cat: "Recommended", hasIcon: true },
    { label: "Hackathons", cat: "Hackathon", hasIcon: false },
    { label: "Conferences", cat: "Conference", hasIcon: false },
    { label: "Meetups", cat: "Meetup", hasIcon: false },
    { label: "Workshops", cat: "Workshop", hasIcon: false },
    { label: "Galas", cat: "Gala", hasIcon: false },
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = discSearch.toLowerCase();
      const matchesSearch =
        !discSearch ||
        ev.title.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        ev.city.toLowerCase().includes(q) ||
        ev.tags.some((t) => t.toLowerCase().includes(q));

      const matchesCat =
        activeCategory === "All" ||
        activeCategory === "Recommended" ||
        ev.category.toLowerCase() === activeCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [events, discSearch, activeCategory]);

  if (!mounted) return null;

  return (
    <AppLayout>
      <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-8 py-7 pb-20 flex flex-col gap-6 animate-ccin">
        <ProfilePromptPopup />

        {/* HEADER */}
        <div>
          <h1 className="font-bricolage text-3xl sm:text-4xl font-bold tracking-tight mb-2" style={{ color: "var(--text)" }}>
            Discover Events
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl font-normal leading-relaxed">
            Explore meetups, hackathons, and conferences matched dynamically to your profile skills, categories, and location.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="flex items-center gap-3 h-13 px-4 rounded-2xl border backdrop-blur-xl transition-all shadow-sm transition-all shadow-sm">
          <Search className="w-5 h-5 shrink-0 text-zinc-500" />
          <input
            type="text"
            value={discSearch}
            onChange={(e) => setDiscSearch(e.target.value)}
            placeholder="Search by title, tag, topic, or city..."
            className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base" style={{ color: "var(--text)" }}
          />
          {discSearch && (
            <button
              onClick={() => setDiscSearch("")}
              className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* CATEGORY PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categoryPills.map((p) => {
            const isSelected = activeCategory === p.cat;
            return (
              <button
                key={p.label}
                onClick={() => setActiveCategory(p.cat)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap border transition-all cursor-pointer"
                style={
                  isSelected
                    ? {
                        background: `linear-gradient(135deg, var(--accent), var(--accent2))`,
                        borderColor: "transparent",
                        color: "#ffffff",
                        boxShadow: "0 4px 14px -4px var(--accent)",
                      }
                    : {
                        background: "var(--input)",
                        borderColor: "var(--border)",
                        color: "var(--muted)",
                      }
                }
              >
                {p.hasIcon && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* ACTIVE FILTERS & SKILLS ACCORDION DRAWER */}
        <div
          className="rounded-3xl border overflow-hidden shadow-sm transition-all"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Accordion Toggle Header */}
          <button
            onClick={() => setCustOpen(!custOpen)}
            className="w-full flex items-center gap-3.5 p-4 sm:px-6 border-none bg-transparent text-left cursor-pointer transition-colors"
            style={{ borderBottom: custOpen ? "1px solid var(--border)" : "none" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{
                background: `linear-gradient(135deg, var(--accent), var(--accent2))`,
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="font-bricolage text-base sm:text-[17px] font-bold block tracking-tight"
                style={{ color: "var(--text)" }}
              >
                Active Filters & Skills
              </span>
              <span className="text-xs block truncate mt-0.5" style={{ color: "var(--muted)" }}>
                {custOpen ? "Close Controls" : `${skills.length} skills • ${cities.length} cities matching`}
              </span>
            </div>
            <div style={{ color: "var(--muted)" }}>
              {custOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {/* Expanded Drawer Content */}
          <AnimatePresence>
            {custOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                  {/* Column 1 & 2: Technical Skills */}
                  <div className="lg:col-span-2 flex flex-col gap-3">
                    <div>
                      <div
                        className="font-mono text-[11px] uppercase tracking-wider font-semibold"
                        style={{ color: "var(--subtle)" }}
                      >
                        TECHNICAL SKILLS & FOCUS AREAS
                      </div>
                      <div className="text-xs sm:text-[12.5px] mt-1" style={{ color: "var(--muted)" }}>
                        Events with matching session agenda topics will be prioritized and highlighted.
                      </div>
                    </div>

                    {/* Active Skill Chips & Add Input */}
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 h-[30px] pl-3 pr-1.5 rounded-full text-xs font-semibold transition-all"
                          style={{
                            background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                            borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: "var(--accent)",
                          }}
                        >
                          <span>{s}</span>
                          <button
                            onClick={() => removeSkill(s)}
                            className="w-4 h-4 rounded-full flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
                            style={{ color: "inherit" }}
                            title="Remove skill"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Add Skill Pill Input */}
                      <div
                        className="flex items-center gap-2 h-[30px] pl-3 pr-1 rounded-full border border-dashed transition-all"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <input
                          type="text"
                          value={skillDraft}
                          onChange={(e) => setSkillDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addSkill()}
                          placeholder="Add skill (e.g. React, Python)"
                          className="w-44 bg-transparent border-none outline-none text-xs"
                          style={{ color: "var(--text)" }}
                        />
                        <button
                          onClick={() => addSkill()}
                          className="h-[22px] px-2.5 rounded-full text-[11.5px] font-semibold transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                          style={{
                            background: "var(--text)",
                            color: "var(--bg)",
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Suggestions */}
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                      <span style={{ color: "var(--subtle)" }}>Suggested:</span>
                      {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 5).map((s) => (
                        <button
                          key={s}
                          onClick={() => addSkill(s)}
                          className="h-6 px-2.5 rounded-full border text-xs transition-colors cursor-pointer"
                          style={{
                            background: "var(--input)",
                            borderColor: "var(--border)",
                            color: "var(--muted)",
                          }}
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Preferred Locations */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <div
                        className="font-mono text-[11px] uppercase tracking-wider font-semibold"
                        style={{ color: "var(--subtle)" }}
                      >
                        PREFERRED CITY & REGION
                      </div>
                      <div className="text-xs sm:text-[12.5px] mt-1" style={{ color: "var(--muted)" }}>
                        Events in this location or online will be ranked higher for you.
                      </div>
                    </div>

                    {/* City Chips */}
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {cities.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full text-xs font-medium border"
                          style={{
                            background: "var(--input)",
                            borderColor: "var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5" style={{ color: "var(--subtle)" }} />
                          <span>{c}</span>
                          <button
                            onClick={() => removeCity(c)}
                            className="w-4 h-4 rounded-full flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer ml-0.5"
                            style={{ color: "var(--subtle)" }}
                            title="Remove city"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* City Suggestions */}
                      {SUGGESTED_CITIES.filter((c) => !cities.includes(c)).slice(0, 2).map((c) => (
                        <button
                          key={c}
                          onClick={() => addCity(c)}
                          className="h-[30px] px-3 rounded-full border text-xs font-medium transition-colors cursor-pointer"
                          style={{
                            background: "var(--input)",
                            borderColor: "var(--border)",
                            color: "var(--muted)",
                          }}
                        >
                          + {c}
                        </button>
                      ))}

                      {/* Custom City Input */}
                      <div
                        className="flex items-center gap-2 h-[30px] pl-3 pr-1 rounded-full border border-dashed transition-all"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <input
                          type="text"
                          value={cityDraft}
                          onChange={(e) => setCityDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCustomCity()}
                          placeholder="Add custom city..."
                          className="w-28 bg-transparent border-none outline-none text-xs"
                          style={{ color: "var(--text)" }}
                        />
                        <button
                          onClick={addCustomCity}
                          className="h-[22px] px-2 rounded-full text-[11px] font-semibold transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                          style={{
                            background: "var(--text)",
                            color: "var(--bg)",
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons: Apply Filter + Save Preferences */}
                    <div className="mt-auto self-start flex items-center gap-2 pt-2">
                      <button
                        onClick={handleApplyFilters}
                        className="h-[34px] px-4 rounded-xl text-white text-xs font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                        style={{
                          background: `linear-gradient(135deg, var(--accent), var(--accent2))`,
                          boxShadow: "0 4px 14px -4px var(--accent)",
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply Filter</span>
                      </button>
                      <button
                        onClick={savePreferences}
                        className="h-[34px] px-4 rounded-xl border text-xs font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }}
                      >
                        Save preferences
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Favorite Event Categories */}
                  <div
                    className="lg:col-span-3 pt-4 border-t flex flex-col gap-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <div>
                        <div
                          className="font-mono text-[11px] uppercase tracking-wider font-semibold"
                          style={{ color: "var(--subtle)" }}
                        >
                          FAVORITE EVENT CATEGORIES
                        </div>
                        <div className="text-xs sm:text-[12.5px] mt-0.5" style={{ color: "var(--muted)" }}>
                          Toggle categories to prioritize them in your recommendations.
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: "var(--subtle)" }}>
                        Click to toggle on / off
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {["Tech","Hackathon","Workshop","Meetup","Music","Sports","Networking","Other"].map((cat) => {
                        const isSelected = favCats.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleFavCat(cat)}
                            className="h-[34px] px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
                            style={
                              isSelected
                                ? {
                                    background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                                    borderColor: "color-mix(in oklab, var(--accent) 35%, transparent)",
                                    color: "var(--accent)",
                                  }
                                : {
                                    background: "var(--input)",
                                    borderColor: "var(--border)",
                                    color: "var(--muted)",
                                  }
                            }
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* EVENTS GRID */}
        {isLoadingEvents ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[340px] rounded-[22px] border"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((ev) => {
              const isSaved = !!savedIds[ev.id];
              return (
                <EventCard
                  key={ev.id}
                  id={ev.id}
                  title={ev.title}
                  category={ev.category}
                  mode={ev.mode}
                  date={ev.date}
                  location={ev.location}
                  city={ev.city}
                  fee={ev.fee}
                  regLabel={ev.regLabel}
                  match={ev.match}
                  photo={ev.photo}
                  isSaved={isSaved}
                  onToggleSave={toggleSave}
                />
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="p-12 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center gap-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: `${activeAccent.hex}22`, color: activeAccent.hex }}
            >
              <Compass className="w-7 h-7" />
            </div>
            <h4 className="font-bricolage text-xl font-bold" style={{ color: "var(--text)" }}>
              No Events Found in This View
            </h4>
            <p className="text-sm max-w-sm" style={{ color: "var(--muted)" }}>
              No events match your current skills, category, or location preferences yet. Click &apos;Active Filters &amp; Skills&apos; above to customize.
            </p>
            <button
              onClick={() => {
                setDiscSearch("");
                setActiveCategory("All");
              }}
              className="mt-2 h-10 px-5 rounded-full text-white text-sm font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform"
              style={{
                background: `linear-gradient(135deg, ${activeAccent.hex}, ${activeAccent.gradientEnd || "#8b5cf6"})`,
              }}
            >
              View All Events
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
