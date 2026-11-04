"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ListPlus, Sparkles, Wand2, ArrowRight,
  Filter, Tag, Check, Layers, SlidersHorizontal, X
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { EVENT_TEMPLATES, CUSTOM_TEMPLATE_ID, EventTemplate } from "@/lib/eventTemplates";
import { useAppearance } from "@/components/providers/AppearanceProvider";

interface TemplateMeta {
  group: "Tech & Hackathons" | "Business & Corporate" | "Academic & Training" | "Social & Community" | "Sports & Civic";
  badge: string;
  summary: string;
  tags: string[];
}

const TEMPLATE_METADATA: Record<string, TemplateMeta> = {
  "Technical Conferences": {
    group: "Tech & Hackathons",
    badge: "Conference",
    summary: "Tracks, keynote speakers, sponsor tiers, and multi-session agendas.",
    tags: ["Tracks", "Speakers", "Sponsors", "Agenda"]
  },
  "Hackathons and Competitions": {
    group: "Tech & Hackathons",
    badge: "Hackathon",
    summary: "Prize pools, project submissions, judging criteria, and tech stacks.",
    tags: ["Prizes", "Submissions", "Criteria", "Stack"]
  },
  "Corporate Events": {
    group: "Business & Corporate",
    badge: "Corporate",
    summary: "Internal/external visibility, dress codes, RSVP deadlines, and catering.",
    tags: ["RSVP", "Dress Code", "Catering", "Dept"]
  },
  "Exhibitions and Trade Shows": {
    group: "Business & Corporate",
    badge: "Trade Show",
    summary: "Exhibitor booths, floor layouts, industry sectors, and tier pricing.",
    tags: ["Booths", "Exhibitors", "Pricing", "Industry"]
  },
  "Academic and Training Events": {
    group: "Academic & Training",
    badge: "Training",
    summary: "Course outlines, instructor profiles, certifications, and prerequisites.",
    tags: ["Instructor", "Syllabus", "Certificate", "Fee"]
  },
  "Weddings and Personal Events": {
    group: "Social & Community",
    badge: "Celebration",
    summary: "Host details, RSVP tracking, gift registry links, and expected guests.",
    tags: ["Hosts", "RSVP", "Registry", "Guests"]
  },
  "Community and Nonprofit Events": {
    group: "Social & Community",
    badge: "Nonprofit",
    summary: "Cause mission, volunteer registration, partner orgs, and donations.",
    tags: ["Cause", "Volunteers", "Donations", "Partners"]
  },
  "Sports and Recreational Events": {
    group: "Sports & Civic",
    badge: "Athletics",
    summary: "Sport disciplines, team/solo tournament formats, gear, and skill levels.",
    tags: ["Discipline", "Format", "Gear", "Skill Level"]
  },
  "Government and Civic Events": {
    group: "Sports & Civic",
    badge: "Civic",
    summary: "Department authorities, public notices, permits, and accessibility.",
    tags: ["Authority", "Public/Private", "Permits", "Access"]
  },
  "Hybrid and Virtual Events": {
    group: "Tech & Hackathons",
    badge: "Virtual",
    summary: "Streaming platforms, session recordings, global timezones, and limits.",
    tags: ["Stream", "Recording", "Timezones", "Cap"]
  }
};

const CATEGORY_TABS = [
  "All Templates",
  "Tech & Hackathons",
  "Business & Corporate",
  "Academic & Training",
  "Social & Community",
  "Sports & Civic"
] as const;

type CategoryTab = (typeof CATEGORY_TABS)[number];

export default function SelectTemplatePage() {
  const router = useRouter();
  const { isDark, activeAccent } = useAppearance();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTab>("All Templates");

  const filteredTemplates = useMemo(() => {
    let result = EVENT_TEMPLATES;

    // Filter by category tab
    if (activeTab !== "All Templates") {
      result = result.filter((tpl) => TEMPLATE_METADATA[tpl.id]?.group === activeTab);
    }

    // Filter by text search
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (tpl) =>
          tpl.label.toLowerCase().includes(q) ||
          TEMPLATE_METADATA[tpl.id]?.summary.toLowerCase().includes(q) ||
          TEMPLATE_METADATA[tpl.id]?.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return result;
  }, [query, activeTab]);

  const handleSelect = (templateId: string) => {
    router.push(`/events/create/new?template=${encodeURIComponent(templateId)}`);
  };

  return (
    <AppLayout>
      <div
        className="min-h-screen w-full transition-colors duration-300 pb-16"
        style={{
          background: "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--accent) 8%, var(--bg)), var(--bg))",
          color: "var(--text)"
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 animate-in fade-in duration-300">
          {/* 1. HEADER SECTION (MATCHING STANDALONE PROTOTYPE) */}
          <div className="space-y-2 border-b pb-6" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider"
                style={{
                  background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                  color: "var(--accent)",
                  border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)"
                }}
              >
                Event Studio &bull; Step 1
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                Workspace &gt; Create an Event
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight"
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.035em" }}
                >
                  Create an Event
                </h1>
                <p className="text-xs sm:text-sm mt-1 max-w-2xl font-medium" style={{ color: "var(--muted)" }}>
                  Pick a pre-configured template to get started with tailored fields, craft an event with AI, or build a custom setup from scratch.
                </p>
              </div>

              <button
                onClick={() => handleSelect(CUSTOM_TEMPLATE_ID)}
                className="h-9 px-4 rounded-xl border text-xs font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
                style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                <ListPlus className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                Blank Custom Canvas
              </button>
            </div>
          </div>

          {/* 2. HERO AI BANNER (SLEEK GRADIENT MATCHING PROTOTYPE) */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            onClick={() => router.push("/events/create/ai")}
            className="w-full text-left rounded-3xl p-6 sm:p-7 shadow-xl cursor-pointer relative overflow-hidden transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 20%, #4f46e5), #7c3aed 60%, #9333ea)",
              boxShadow: "0 14px 34px -14px rgba(79, 70, 229, 0.45)"
            }}
          >
            {/* Subtle decorative background glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10 text-white">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-md">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-lg sm:text-xl font-extrabold tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Create with AI
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest text-white border border-white/25">
                      New
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-indigo-100 font-medium mt-1 max-w-xl leading-relaxed">
                    Describe your event in plain language or speak it — AI drafts the schedule, custom fields, and rules for you to review and publish.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white text-indigo-700 font-bold px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm shadow-lg hover:bg-indigo-50 transition-all">
                  Try it <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* 3. SEARCH & CATEGORY FILTER TABS (BETTER ARRANGEMENT) */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--muted)" }}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search templates by title, theme, or fields..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all shadow-xs"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                    border: "1px solid var(--border)"
                  }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:opacity-80 cursor-pointer"
                    style={{ color: "var(--muted)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Template Count Tag */}
              <div className="flex items-center gap-2 text-xs font-mono font-bold" style={{ color: "var(--muted)" }}>
                <Layers className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                <span>
                  Showing {filteredTemplates.length + 1} blueprints ({activeTab})
                </span>
              </div>
            </div>

            {/* Horizontal Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeTab === tab;
                const tabCount =
                  tab === "All Templates"
                    ? EVENT_TEMPLATES.length
                    : EVENT_TEMPLATES.filter((t) => TEMPLATE_METADATA[t.id]?.group === tab).length;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-xs"
                    style={
                      isActive
                        ? {
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                          color: "#fff",
                          boxShadow: "0 4px 12px color-mix(in oklab, var(--accent) 25%, transparent)"
                        }
                        : {
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          color: "var(--muted)"
                        }
                    }
                  >
                    <span>{tab}</span>
                    <span
                      className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold"
                      style={
                        isActive
                          ? { background: "rgba(255, 255, 255, 0.2)", color: "#fff" }
                          : { background: "var(--input)", color: "var(--subtle)" }
                      }
                    >
                      {tabCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. TEMPLATE CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Custom Blank Canvas Card (First in the grid for quick creation) */}
            <motion.button
              type="button"
              onClick={() => handleSelect(CUSTOM_TEMPLATE_ID)}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-left rounded-3xl border-2 border-dashed flex flex-col justify-between overflow-hidden cursor-pointer shadow-xs transition-all duration-200 group"
              style={{
                background: "color-mix(in oklab, var(--card) 60%, transparent)",
                borderColor: "color-mix(in oklab, var(--accent) 40%, var(--border))",
                minHeight: "260px"
              }}
            >
              {/* Header Box */}
              <div
                className="h-32 w-full flex flex-col items-center justify-center p-4 relative overflow-hidden"
                style={{
                  background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--accent) 15%, var(--card2)), var(--card2))"
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    color: "#fff"
                  }}
                >
                  <ListPlus className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider mt-2" style={{ color: "var(--accent)" }}>
                  Blank Canvas
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-1.5"
                    style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}
                  >
                    Custom Event
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                    Build your own fields, schedules, tickets, and forms completely from scratch without presets.
                  </p>
                </div>

                <div className="pt-3 border-t flex items-center justify-between text-xs font-bold" style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
                  <span>Start with Custom Form</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </motion.button>

            {/* Predefined Template Cards */}
            {filteredTemplates.map((tpl) => {
              const meta = TEMPLATE_METADATA[tpl.id] || {
                group: "Tech & Hackathons",
                badge: "Event",
                summary: "Pre-configured fields, timelines, and registration form schemas.",
                tags: ["Preset"]
              };

              return (
                <motion.button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelect(tpl.id)}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-left rounded-3xl border flex flex-col justify-between overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-200 group"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)"
                  }}
                >
                  {/* Image Cover with Gradient Scrim and Badges */}
                  <div className="h-36 w-full relative overflow-hidden shrink-0">
                    <img
                      src={tpl.imageUrl}
                      alt={tpl.label}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, transparent 60%)"
                      }}
                    />

                    {/* Category Pill (Top Left) */}
                    <div className="absolute top-3 left-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs transition-colors"
                        style={{
                          background: "rgba(15, 23, 42, 0.85)",
                          color: "#ffffff",
                          border: "1px solid rgba(255, 255, 255, 0.25)"
                        }}
                      >
                        {meta.badge}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3
                        className="text-base sm:text-lg font-extrabold tracking-tight line-clamp-1 transition-opacity group-hover:opacity-90"
                        style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}
                      >
                        {tpl.label}
                      </h3>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--muted)" }}>
                        {meta.summary}
                      </p>

                      {/* Tag Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {meta.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                            style={{
                              background: "var(--card2)",
                              borderColor: "var(--border)",
                              color: "var(--subtle)"
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {meta.tags.length > 3 && (
                          <span
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium"
                            style={{ color: "var(--subtle)" }}
                          >
                            +{meta.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div
                      className="pt-3 border-t flex items-center justify-between text-xs font-bold transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      <span className="group-hover:opacity-100 opacity-80" style={{ color: "var(--muted)" }}>
                        Configure Template
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs font-extrabold"
                        style={{ color: "var(--accent)" }}
                      >
                        Use <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* 5. EMPTY SEARCH STATE */}
          {filteredTemplates.length === 0 && (
            <div
              className="text-center py-16 px-4 rounded-3xl border border-dashed space-y-4"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "var(--card2)", color: "var(--accent)" }}
              >
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>
                  No templates match &quot;{query}&quot;
                </h3>
                <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: "var(--muted)" }}>
                  Try another keyword, switch category tabs, or start with the custom template to design your own setup.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setQuery("")}
                  className="px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer"
                  style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  Clear search
                </button>
                <button
                  onClick={() => handleSelect(CUSTOM_TEMPLATE_ID)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                >
                  Start Custom Blueprint
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
