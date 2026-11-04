"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, MapPin, Users, Ticket, Layers } from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";

interface AuthGeometricShowcaseProps {
  mode?: "login" | "register";
}

const EVENT_TEMPLATES = [
  {
    key: "Tech",
    label: "Tech & AI",
    badgeLabel: "HACKATHON • HYBRID",
    bgDark: "radial-gradient(90% 120% at 100% 0%, #7c3aed 0%, transparent 55%), linear-gradient(135deg, #1e1b4b, #0b0b1a)",
    bgLight: "radial-gradient(90% 120% at 100% 0%, #818cf8 0%, transparent 55%), linear-gradient(135deg, #312e81, #4338ca)",
    wm: "import { hackathon } from 'eventrix'",
    wmFont: "'JetBrains Mono', monospace",
    wmSize: "16px",
    cat: "Hackathon",
    mode: "Hybrid",
    title: "BuildCon AI Hackathon 2026",
    city: "KTPO Convention Centre, Bengaluru",
    day: "15",
    mon: "NOV",
    date: "Sat, 15 Nov – Sun, 16 Nov",
    reg: "142",
    cap: "200",
    pct: "71%",
    fee: "₹500",
    tags: ["AI/ML", "Python", "React"],
    accent: "#6366f1",
    accent2: "#8b5cf6",
    highlight: "24-hr build sprint • ₹1,00,000 Grand Prize",
  },
  {
    key: "Corporate",
    label: "Cloud Summit",
    badgeLabel: "CONFERENCE • OFFLINE",
    bgDark: "radial-gradient(100% 120% at 0% 0%, #0891b2 0%, transparent 60%), linear-gradient(135deg, #0f172a, #1e293b)",
    bgLight: "radial-gradient(100% 120% at 0% 0%, #38bdf8 0%, transparent 60%), linear-gradient(135deg, #0369a1, #0284c7)",
    wm: "SUMMIT / 2026 // KEYNOTE",
    wmFont: "'JetBrains Mono', monospace",
    wmSize: "36px",
    cat: "Conference",
    mode: "Offline",
    title: "CloudNative Summit India",
    city: "HICC International Arena, Hyderabad",
    day: "22",
    mon: "NOV",
    date: "Sat, 22 Nov · 9:00 AM",
    reg: "1,240",
    cap: "1,500",
    pct: "82%",
    fee: "₹2,499",
    tags: ["Cloud", "DevOps", "Kubernetes"],
    accent: "#06b6d4",
    accent2: "#3b82f6",
    highlight: "4 Stages • 40+ Staff & Cloud Engineers",
  },
  {
    key: "Community",
    label: "JS Meetup",
    badgeLabel: "MEETUP • OFFLINE",
    bgDark: "radial-gradient(90% 120% at 100% 0%, #fbbf24 0%, transparent 50%), linear-gradient(135deg, #451a03, #c2410c)",
    bgLight: "radial-gradient(90% 120% at 100% 0%, #fde047 0%, transparent 50%), linear-gradient(135deg, #c2410c, #ea580c)",
    wm: "meet · make · share",
    wmFont: "'Bricolage Grotesque', sans-serif",
    wmSize: "40px",
    cat: "Meetup",
    mode: "Offline",
    title: "Bengaluru JS Meetup #48",
    city: "Indiranagar, Bengaluru",
    day: "06",
    mon: "NOV",
    date: "Thu, 6 Nov · 6:30 PM",
    reg: "64",
    cap: "80",
    pct: "80%",
    fee: "Free",
    tags: ["Node.js", "React", "TypeScript"],
    accent: "#f59e0b",
    accent2: "#ea580c",
    highlight: "Tech lightning talks & networking",
  },
  {
    key: "Sports",
    label: "Sports Run",
    badgeLabel: "SPORTS • OFFLINE",
    bgDark: "radial-gradient(90% 120% at 100% 100%, #34d399 0%, transparent 50%), linear-gradient(135deg, #022c22, #047857)",
    bgLight: "radial-gradient(90% 120% at 100% 100%, #6ee7b7 0%, transparent 50%), linear-gradient(135deg, #047857, #059669)",
    wm: "ON YOUR MARKS // 2026",
    wmFont: "'Bricolage Grotesque', sans-serif",
    wmSize: "42px",
    cat: "Sports",
    mode: "Offline",
    title: "Monsoon 10K Community Run",
    city: "Cubbon Park, Bengaluru",
    day: "29",
    mon: "NOV",
    date: "Sat, 29 Nov · 6:00 AM",
    reg: "410",
    cap: "500",
    pct: "82%",
    fee: "₹350",
    tags: ["Fitness", "Marathon", "Outdoor"],
    accent: "#10b981",
    accent2: "#059669",
    highlight: "RFID Chip Timing • Medals & Breakfast",
  },
];

export default function AuthGeometricShowcase({ mode = "login" }: AuthGeometricShowcaseProps) {
  const { isDark } = useAppearance();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const current = EVENT_TEMPLATES[selectedIdx];

  // Auto-cycle through templates every 5 seconds for dynamic attraction
  useEffect(() => {
    const timer = setInterval(() => {
      setSelectedIdx((prev) => (prev + 1) % EVENT_TEMPLATES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="relative w-full h-full min-h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 select-none transition-colors duration-300"
      style={{
        background: isDark ? "#07090e" : "#f6f7f9",
      }}
    >
      {/* 1. ARCHITECTURAL BLUEPRINT GRID BACKGROUND */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isDark ? 0.14 : 0.45,
          backgroundImage: isDark
            ? `
              linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px)
            `
            : `
              linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px)
            `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* 2. AMBIENT GLOW ORBS */}
      <div 
        className="absolute top-1/4 left-1/4 w-[480px] h-[480px] rounded-full pointer-events-none blur-[140px] transition-all duration-1000"
        style={{
          opacity: isDark ? 0.35 : 0.22,
          background: `radial-gradient(circle, ${current.accent}, transparent 70%)`,
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[440px] h-[440px] rounded-full pointer-events-none blur-[140px] transition-all duration-1000"
        style={{
          opacity: isDark ? 0.3 : 0.18,
          background: `radial-gradient(circle, ${current.accent2}, transparent 70%)`,
        }}
      />

      {/* 3. TOP SHOWCASE HEADER & TEMPLATE PILL SELECTOR */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-white/10 backdrop-blur-md border border-zinc-300 dark:border-white/15 text-zinc-900 dark:text-white text-[11px] font-mono font-bold uppercase tracking-wider shadow-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>EVENT TEMPLATES & THEMES</span>
          </div>

          <div className="font-mono text-[9.5px] uppercase tracking-widest text-zinc-500 dark:text-white/40 font-bold hidden sm:block">
            DYNAMIC THEME ENGINE
          </div>
        </div>

        <div>
          <h2 className="font-bricolage text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
            Tailored Experiences for Every Gathering
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm font-medium mt-1 max-w-lg leading-relaxed">
            From 24-hour AI hackathons to global summits and local meetups, preview our dynamic event portal templates.
          </p>
        </div>

        {/* Template Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {EVENT_TEMPLATES.map((tpl, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={tpl.key}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "bg-white text-zinc-950 shadow-lg scale-105"
                      : "bg-zinc-950 text-white shadow-md scale-105"
                    : isDark
                      ? "bg-white/10 hover:bg-white/15 text-white/80 border border-white/10"
                      : "bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 shadow-xs"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: tpl.accent }}
                />
                <span>{tpl.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN ARTISTIC SHOWCASE: LIVE EVENT TEMPLATE BANNER & CARD */}
      <div className="relative z-10 my-auto py-6 flex flex-col items-center justify-center">
        
        {/* Outer Perspective Wrapper (Theme Adaptive: White on light, Dark slate on dark) */}
        <div 
          className="w-full max-w-[440px] rounded-[24px] overflow-hidden transition-all duration-500 cc-event-card border border-zinc-200/90 dark:border-white/12 bg-white dark:bg-zinc-900/90 shadow-xl dark:shadow-2xl"
          style={{
            background: isDark ? "rgba(24, 24, 27, 0.9)" : "#ffffff",
            boxShadow: isDark
              ? "0 30px 90px -20px rgba(0, 0, 0, 0.85)"
              : "0 20px 45px -15px rgba(15, 23, 42, 0.12), 0 4px 16px -2px rgba(15, 23, 42, 0.06)",
          }}
        >
          
          {/* A. Dynamic Thematic Hero Banner (Theme Adaptive) */}
          <div 
            className="relative h-44 sm:h-48 p-5 flex flex-col justify-between overflow-hidden transition-all duration-700 text-white"
            style={{
              background: isDark ? current.bgDark : current.bgLight,
            }}
          >
            {/* Thematic Watermark */}
            <div 
              className="absolute right-[-10px] bottom-3 pointer-events-none whitespace-nowrap italic tracking-tight transition-all duration-500"
              style={{
                fontFamily: current.wmFont,
                fontSize: current.wmSize,
                color: "#ffffff",
                opacity: isDark ? 0.16 : 0.22,
              }}
            >
              {current.wm}
            </div>

            {/* Top row: Date Badge & Category / Event Mode Tags */}
            <div className="relative flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span 
                  className="px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider shadow-xs backdrop-blur-md"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.25)",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    color: "#ffffff",
                  }}
                >
                  {current.cat}
                </span>
                <span 
                  className="px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider shadow-xs backdrop-blur-md flex items-center gap-1.5"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    color: "#ffffff",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-bold text-white tracking-wide">{current.mode}</span>
                </span>
              </div>

              {/* Date Box */}
              <div 
                className="px-2.5 py-1 rounded-xl text-center shadow-sm backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.22)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  color: "#ffffff",
                }}
              >
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase leading-none opacity-90">{current.mon}</p>
                <p className="font-bricolage text-sm font-black leading-none mt-0.5">{current.day}</p>
              </div>
            </div>

            {/* Bottom row: Event Title inside Hero */}
            <div className="relative z-10">
              <h3 className="font-bricolage text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                {current.title}
              </h3>
              <p className="text-white/90 text-xs font-medium mt-0.5 flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <span>{current.city}</span>
              </p>
            </div>
          </div>

          {/* B. Card Body (Matches .cc-event-card theme adaptation in application) */}
          <div 
            className="p-5 sm:p-6 space-y-4 transition-colors duration-300 bg-white dark:bg-zinc-950/85 text-zinc-950 dark:text-zinc-50"
          >
            {/* Highlight Banner */}
            <div 
              className="p-3 rounded-2xl flex items-center justify-between text-xs transition-colors duration-300 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
            >
              <span className="font-medium truncate text-slate-700 dark:text-zinc-300">
                {current.highlight}
              </span>
              <span 
                className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              >
                {current.fee}
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-zinc-400">Seats Capacity</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {current.reg} / {current.cap} registered
                </span>
              </div>
              <div 
                className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10"
              >
                <div 
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: current.pct,
                    background: `linear-gradient(90deg, ${current.accent}, ${current.accent2})`,
                  }}
                />
              </div>
            </div>

            {/* Tags list */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {current.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold transition-colors bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-zinc-200"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Footer with portal preview badge */}
            <div 
              className="pt-3 flex items-center justify-between text-[11px] transition-colors border-t border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Smart AI Team & Agenda Matching</span>
              </span>
              <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-white/40">
                PREVIEW
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* 5. BOTTOM SOCIAL PROOF & METRICS */}
      <div 
        className="relative z-10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono transition-colors duration-300"
        style={{
          borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
          color: isDark ? "#a1a1aa" : "#64748b",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span 
            className="font-bold uppercase tracking-wider text-[11px]"
            style={{ color: isDark ? "#e4e4e7" : "#1e293b" }}
          >
            EVENTRIX
          </span>
        </div>
        <div className="text-[10.5px] uppercase tracking-widest">
          6+ Dynamic Themes • Real-time Check-in • Custom Agendas
        </div>
      </div>

    </div>
  );
}
