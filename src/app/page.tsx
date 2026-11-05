"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Users,
  Ticket,
  Layers,
  Calendar,
  Award,
  Cpu,
  Clock,
  Radio,
  Sun,
  Moon,
  Bell,
  Plus,
  QrCode,
  Compass,
  BarChart3,
  Bot,
  Flame,
  Globe2,
} from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { hasStoredSession } from "@/lib/auth";

// 6 Curated Event Visual Themes from Section 7.3
const EVENT_THEMES_PREVIEW = [
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
    tags: ["AI/ML", "Python", "React", "Next.js"],
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
    wmSize: "32px",
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
    tags: ["Cloud", "DevOps", "Kubernetes", "AWS"],
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
    title: "Bengaluru JS Community #48",
    city: "Indiranagar, Bengaluru",
    day: "06",
    mon: "NOV",
    date: "Thu, 6 Nov · 6:30 PM",
    reg: "64",
    cap: "80",
    pct: "80%",
    fee: "Free",
    tags: ["Node.js", "React", "TypeScript", "Vite"],
    accent: "#f59e0b",
    accent2: "#ea580c",
    highlight: "Lightning talks, networking & pizza",
  },
  {
    key: "Sports",
    label: "Sports Run",
    badgeLabel: "SPORTS • OFFLINE",
    bgDark: "radial-gradient(90% 120% at 100% 100%, #34d399 0%, transparent 50%), linear-gradient(135deg, #022c22, #047857)",
    bgLight: "radial-gradient(90% 120% at 100% 100%, #6ee7b7 0%, transparent 50%), linear-gradient(135deg, #047857, #059669)",
    wm: "ON YOUR MARKS // 2026",
    wmFont: "'Bricolage Grotesque', sans-serif",
    wmSize: "36px",
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
    tags: ["Fitness", "Marathon", "Outdoor", "Health"],
    accent: "#10b981",
    accent2: "#059669",
    highlight: "RFID Chip Timing • Medals & Breakfast",
  },
  {
    key: "Academic",
    label: "Symposium",
    badgeLabel: "SYMPOSIUM • OFFLINE",
    bgDark: "radial-gradient(90% 120% at 0% 0%, #0891b2 0%, transparent 55%), linear-gradient(135deg, #042f2e, #164e63)",
    bgLight: "radial-gradient(90% 120% at 0% 0%, #22d3ee 0%, transparent 55%), linear-gradient(135deg, #0e7490, #155e75)",
    wm: "DISCOURSE // RESEARCH 2026",
    wmFont: "'Bricolage Grotesque', sans-serif",
    wmSize: "30px",
    cat: "Academic",
    mode: "Offline",
    title: "National AI Ethics Symposium",
    city: "IISc Auditorium, Bengaluru",
    day: "12",
    mon: "DEC",
    date: "Fri, 12 Dec · 10:00 AM",
    reg: "320",
    cap: "350",
    pct: "91%",
    fee: "Free",
    tags: ["Ethics", "Research", "Deep Learning"],
    accent: "#06b6d4",
    accent2: "#3b82f6",
    highlight: "Peer-reviewed paper tracks & roundtables",
  },
  {
    key: "Gala",
    label: "Founders Gala",
    badgeLabel: "NETWORKING • OFFLINE",
    bgDark: "radial-gradient(100% 120% at 100% 0%, #fb7185 0%, transparent 50%), linear-gradient(135deg, #4c0519, #881337)",
    bgLight: "radial-gradient(100% 120% at 100% 0%, #f43f5e 0%, transparent 50%), linear-gradient(135deg, #9f1239, #be123c)",
    wm: "FOUNDERS // DEMO NIGHT",
    wmFont: "'Playfair Display', serif",
    wmSize: "38px",
    cat: "Networking",
    mode: "Offline",
    title: "Techstars Demo Day & Gala",
    city: "The Leela Palace, Bengaluru",
    day: "18",
    mon: "DEC",
    date: "Thu, 18 Dec · 7:00 PM",
    reg: "190",
    cap: "200",
    pct: "95%",
    fee: "₹1,500",
    tags: ["Startups", "VCs", "Pitch", "Angels"],
    accent: "#f43f5e",
    accent2: "#ec4899",
    highlight: "12 Seed Pitch Teams • 50+ Top Angel Investors",
  },
];

const ACCENT_OPTIONS = [
  { id: "indigo", name: "Indigo", color1: "#6366f1", color2: "#8b5cf6" },
  { id: "violet", name: "Violet", color1: "#8b5cf6", color2: "#d946ef" },
  { id: "emerald", name: "Emerald", color1: "#10b981", color2: "#14b8a6" },
  { id: "rose", name: "Rose", color1: "#f43f5e", color2: "#ec4899" },
  { id: "cyan", name: "Cyan", color1: "#06b6d4", color2: "#3b82f6" },
  { id: "amber", name: "Amber", color1: "#f59e0b", color2: "#ea580c" },
] as const;

export default function LandingPage() {
  const { isDark, toggleTheme, settings, updateSetting } = useAppearance();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeThemeIdx, setActiveThemeIdx] = useState(0);

  useEffect(() => {
    if (hasStoredSession()) {
      setIsLoggedIn(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/discover");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const currentTpl = EVENT_THEMES_PREVIEW[activeThemeIdx];

  return (
    <PageTransition>
      <div
        className="min-h-screen w-full relative overflow-x-clip selection:bg-indigo-500/30 selection:text-white transition-colors duration-300"
        style={{
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        {/* =========================================================
            B1: BACKGROUND RADIAL GLOW ORBS & BLUEPRINT GRID
            ========================================================= */}
        <div
          className="fixed top-[-100px] left-[-100px] w-[720px] h-[720px] rounded-full pointer-events-none blur-[140px] z-0 transition-all duration-700"
          style={{
            background: "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 24%, transparent), transparent 75%)",
          }}
        />
        <div
          className="fixed bottom-[-100px] right-[-100px] w-[640px] h-[640px] rounded-full pointer-events-none blur-[140px] z-0 transition-all duration-700"
          style={{
            background: "radial-gradient(closest-side, color-mix(in oklab, var(--accent2) 16%, transparent), transparent 75%)",
          }}
        />
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
          style={{
            opacity: isDark ? 0.08 : 0.45,
            backgroundImage: isDark
              ? `linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px)`
              : `linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* =========================================================
            L3 & 4.2: STATIC FROSTED GLASS HEADER (STANDALONE PROTOTYPE)
            Pinned at top (sticky top-0 z-50), content scrolls underneath
            ========================================================= */}
        <header
          className="sticky top-0 z-50 w-full h-16 border-b transition-colors duration-300"
          style={{
            background: "var(--chrome)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: "var(--border)",
            boxShadow: isDark
              ? "0 4px 24px -2px rgba(0, 0, 0, 0.45)"
              : "0 4px 20px -2px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div className="max-w-7xl mx-auto h-full px-4 sm:px-7 flex items-center justify-between gap-3 sm:gap-6">
            
            {/* Left: Brand Wordmark Block (Modern geometric vector mark + Eventrix) */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  boxShadow: "0 6px 18px -6px var(--accent)",
                }}
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5h14M5 12h9M5 19h14" />
                  <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span
                className="font-bricolage text-[18px] font-bold tracking-tight whitespace-nowrap"
                style={{ color: "var(--text)" }}
              >
                Event<span style={{ color: "var(--accent)" }}>rix</span>
              </span>
            </Link>

            {/* Right: Controls & Actions (Host event 36px pill, Theme toggle 36px square, Notifications 36px square, Auth) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              
              {/* 1. Host Event Gradient Pill Button (Hidden on tiny phone screens to prevent header cutoff) */}
              <Link
                href={isLoggedIn ? "/events/create" : "/login"}
                className="hidden sm:inline-flex h-9 px-3.5 rounded-full text-[13px] font-semibold !text-white items-center gap-1.5 transition-all hover:translate-y-[-1px] active:translate-y-0 cursor-pointer shadow-sm hover:shadow-md"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  boxShadow: "0 8px 20px -8px var(--accent)",
                }}
              >
                <Plus className="w-3.5 h-3.5 !text-white" />
                <span className="!text-white font-semibold">Host event</span>
              </Link>

              {/* 2. Theme Toggle (32px-36px, Section 5-L3 & 6.1) */}
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] border border-[var(--border)] bg-[var(--input)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                )}
              </button>

              {/* 3. Notifications Button (32px-36px, with 8px #ef4444 unread dot) */}
              <Link
                href={isLoggedIn ? "/notifications" : "/login"}
                title="Notifications"
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] border border-[var(--border)] bg-[var(--input)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ef4444]"
                  style={{
                    boxShadow: "0 0 0 2px var(--bg)",
                  }}
                />
              </Link>

              {/* 4. Auth Buttons / Dashboard Access */}
              {isLoggedIn ? (
                <Link
                  href="/home"
                  className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs font-bold !text-white flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    boxShadow: "0 8px 20px -8px var(--accent)",
                  }}
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 !text-white" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-[10px] text-xs font-semibold border border-[var(--border)] bg-[var(--input)] hover:bg-[var(--card2)] text-[var(--text)] flex items-center justify-center transition-all cursor-pointer shrink-0"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs font-bold !text-white inline-flex items-center gap-1 transition-all hover:scale-[1.02] cursor-pointer shadow-xs shrink-0"
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      boxShadow: "0 8px 20px -8px var(--accent)",
                    }}
                  >
                    <span>Sign Up</span>
                    <ArrowRight className="w-3 h-3 !text-white" />
                  </Link>
                </>
              )}

            </div>
          </div>
        </header>

        {/* =========================================================
            SECTION 3 & CT1-CT2: HERO SECTION
            ========================================================= */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-20 flex flex-col items-center text-center">
          
          {/* Eyebrow Label (JetBrains Mono, uppercase, letter-spacing .08em) */}
          <div
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full font-mono text-[9px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-widest shadow-xs mb-6 transition-colors max-w-full text-center"
            style={{
              background: "var(--card2)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
            }}
          >
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="whitespace-normal">EVENTRIX // THE NEXT-GEN EVENT OPERATING SYSTEM</span>
          </div>

          {/* Page H1: Bricolage Grotesque, bold 700, negative tracking -.04em */}
          <h1 className="font-bricolage text-4xl sm:text-6xl md:text-7xl font-black tracking-[-0.04em] leading-[1.05] max-w-4xl text-balance">
            Where extraordinary tech communities{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--accent), var(--accent2))",
              }}
            >
              gather, build & connect.
            </span>
          </h1>

          {/* Lead Paragraph: Geist 16-18px, var(--muted), line-height 1.5 */}
          <p
            className="text-base sm:text-lg max-w-2xl font-normal leading-relaxed text-balance mt-6"
            style={{ color: "var(--muted)" }}
          >
            The all-in-one ecosystem for hackathons, engineering summits, and creator meetups.
            Intelligent skill-based team matchmaking, dynamic event portal themes, and offline-first QR check-ins.
          </p>

          {/* CTAs: 48px Pill Buttons (Section 6.1 & R1) */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-9 w-full sm:w-auto">
            <Link
              href="/home"
              className="w-full sm:w-auto h-12 px-7 rounded-full text-sm font-bold !text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer shadow-xl"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                boxShadow: "0 8px 24px -8px var(--accent)",
              }}
            >
              <Compass className="w-4 h-4 !text-white" />
              <span>Explore Live Events</span>
              <ArrowRight className="w-4 h-4 !text-white" />
            </Link>

            <Link
              href="/events/create/ai"
              className="w-full sm:w-auto h-12 px-7 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              style={{
                background: "var(--input)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span>Host with AI Assistant</span>
            </Link>
          </div>

          {/* =========================================================
              TRUST & STATS COUNTER BAR (Section 3.2, 4.1, 6.4 Stat Cards)
              ========================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mt-16 sm:mt-20">
            <div
              className="p-5 rounded-[18px] text-left transition-all hover:translate-y-[-2px]"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  Events Hosted
                </span>
                <div
                  className="w-7 h-7 rounded-[9px] flex items-center justify-center"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <Calendar className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-bricolage text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
                240+
              </div>
              <div className="text-[12px] mt-1" style={{ color: "var(--subtle)" }}>
                Across 18 Global Hubs
              </div>
            </div>

            <div
              className="p-5 rounded-[18px] text-left transition-all hover:translate-y-[-2px]"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  Active Attendees
                </span>
                <div
                  className="w-7 h-7 rounded-[9px] flex items-center justify-center"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-bricolage text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
                45,000+
              </div>
              <div className="text-[12px] mt-1" style={{ color: "var(--subtle)" }}>
                Engineers, Creators & Founders
              </div>
            </div>

            <div
              className="p-5 rounded-[18px] text-left transition-all hover:translate-y-[-2px]"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  Check-in Speed
                </span>
                <div
                  className="w-7 h-7 rounded-[9px] flex items-center justify-center"
                  style={{
                    background: "rgba(16, 185, 129, 0.14)",
                    color: "#10b981",
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-bricolage text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
                99.4%
              </div>
              <div className="text-[12px] mt-1" style={{ color: "var(--subtle)" }}>
                Sub-second Offline Verification
              </div>
            </div>

            <div
              className="p-5 rounded-[18px] text-left transition-all hover:translate-y-[-2px]"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  Visual Themes
                </span>
                <div
                  className="w-7 h-7 rounded-[9px] flex items-center justify-center"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-bricolage text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
                6+
              </div>
              <div className="text-[12px] mt-1" style={{ color: "var(--subtle)" }}>
                Tailored Event Design Engines
              </div>
            </div>
          </div>
        </main>

        {/* =========================================================
            SECTION 7.3 & 6.4: LIVE INTERACTIVE THEME SHOWCASE
            ========================================================= */}
        <section id="themes" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--border)]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10.5px] font-bold uppercase tracking-wider mb-3"
                style={{
                  background: "var(--card2)",
                  border: "1px solid var(--border)",
                  color: "var(--accent)",
                }}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>DYNAMIC EVENT PORTALS</span>
              </div>
              <h2 className="font-bricolage text-3xl sm:text-4xl font-black tracking-tight">
                Tailored Visual Engines for Every Gathering
              </h2>
              <p className="text-sm font-medium mt-2 max-w-xl" style={{ color: "var(--muted)" }}>
                From high-intensity hackathons to cloud summits and community meetups, preview our dynamic event portal templates.
              </p>
            </div>

            {/* Template Selector Pills (Section 6.3) */}
            <div className="flex flex-wrap items-center gap-2">
              {EVENT_THEMES_PREVIEW.map((tpl, idx) => {
                const isSelected = activeThemeIdx === idx;
                return (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => setActiveThemeIdx(idx)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? isDark
                          ? "bg-white text-zinc-950 shadow-lg scale-105"
                          : "bg-zinc-950 text-white shadow-md scale-105"
                        : "border hover:border-[var(--accent)]"
                    }`}
                    style={{
                      background: isSelected ? undefined : "var(--input)",
                      borderColor: isSelected ? undefined : "var(--border)",
                      color: isSelected ? undefined : "var(--muted)",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: tpl.accent }} />
                    <span>{tpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Event Card Preview Showcase */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Left: Template Feature Highlights */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div
                className="p-6 rounded-[22px] space-y-4 transition-all"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ background: `linear-gradient(135deg, ${currentTpl.accent}, ${currentTpl.accent2})` }}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bricolage text-xl font-bold tracking-tight">
                      {currentTpl.title}
                    </h3>
                    <p className="text-xs font-mono uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                      {currentTpl.badgeLabel}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                  Each theme adapts its hero bloom, decorative watermark, custom typography, and tags while preserving the platform&apos;s unified glass-morphism aesthetic.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--input)]">
                    <span className="text-[11px] font-mono block uppercase" style={{ color: "var(--subtle)" }}>
                      Location & Format
                    </span>
                    <span className="text-xs font-bold truncate block mt-0.5" style={{ color: "var(--text)" }}>
                      {currentTpl.city}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--input)]">
                    <span className="text-[11px] font-mono block uppercase" style={{ color: "var(--subtle)" }}>
                      Registration Fee
                    </span>
                    <span className="text-xs font-bold block mt-0.5" style={{ color: "var(--text)" }}>
                      {currentTpl.fee} (Live Pass)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Instant Digital Pass + QR Code</span>
                  </span>
                  <Link
                    href="/home"
                    className="font-bold flex items-center gap-1 hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    <span>View in Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: The Live Event Card (Section 6.4 Specification) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center">
              <div
                className="w-full max-w-[440px] rounded-[24px] overflow-hidden transition-all duration-500 cc-event-card border border-zinc-200/90 dark:border-white/12 bg-white dark:bg-zinc-900/90 shadow-2xl"
                style={{
                  background: isDark ? "rgba(24, 24, 27, 0.9)" : "#ffffff",
                }}
              >
                {/* A. Thematic Hero Banner */}
                <div
                  className="relative h-44 sm:h-48 p-5 flex flex-col justify-between overflow-hidden transition-all duration-700 text-white"
                  style={{
                    background: isDark ? currentTpl.bgDark : currentTpl.bgLight,
                  }}
                >
                  {/* Thematic Watermark */}
                  <div
                    className="absolute right-[-10px] bottom-3 pointer-events-none whitespace-nowrap italic tracking-tight"
                    style={{
                      fontFamily: currentTpl.wmFont,
                      fontSize: currentTpl.wmSize,
                      color: "#ffffff",
                      opacity: isDark ? 0.16 : 0.22,
                    }}
                  >
                    {currentTpl.wm}
                  </div>

                  {/* Top row: Category & Mode Pills */}
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
                        {currentTpl.cat}
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
                        <span className="font-bold text-white tracking-wide">{currentTpl.mode}</span>
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
                      <p className="font-mono text-[9px] font-bold tracking-widest uppercase leading-none opacity-90">{currentTpl.mon}</p>
                      <p className="font-bricolage text-sm font-black leading-none mt-0.5">{currentTpl.day}</p>
                    </div>
                  </div>

                  {/* Bottom row: Title */}
                  <div className="relative z-10">
                    <h3 className="font-bricolage text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                      {currentTpl.title}
                    </h3>
                    <p className="text-white/90 text-xs font-medium mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
                      <span>{currentTpl.city}</span>
                    </p>
                  </div>
                </div>

                {/* B. Card Body */}
                <div className="p-5 sm:p-6 space-y-4 bg-white dark:bg-zinc-950/85 text-zinc-950 dark:text-zinc-50 transition-colors">
                  <div className="p-3 rounded-2xl flex items-center justify-between text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <span className="font-medium truncate text-slate-700 dark:text-zinc-300">
                      {currentTpl.highlight}
                    </span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                      {currentTpl.fee}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500 dark:text-zinc-400">Seats Capacity</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {currentTpl.reg} / {currentTpl.cap} registered
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: currentTpl.pct,
                          background: `linear-gradient(90deg, ${currentTpl.accent}, ${currentTpl.accent2})`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {currentTpl.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-zinc-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 flex items-center justify-between text-[11px] border-t border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Smart AI Team & Agenda Matching</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-white/40">
                      PREVIEW
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 6.4: CORE FEATURES GRID
            ========================================================= */}
        <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--border)]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10.5px] font-bold uppercase tracking-wider mb-3"
              style={{
                background: "var(--card2)",
                border: "1px solid var(--border)",
                color: "var(--accent)",
              }}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>PLATFORM ARCHITECTURE</span>
            </div>
            <h2 className="font-bricolage text-3xl sm:text-4xl font-black tracking-tight">
              Built for High-Stakes Tech Gatherings
            </h2>
            <p className="text-sm font-medium mt-2" style={{ color: "var(--muted)" }}>
              Engineered from the ground up with glass-morphic surfaces, offline-first reliability, and seamless teamwork automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div
              className="p-6 rounded-[22px] transition-all hover:translate-y-[-3px] flex flex-col justify-between group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 shadow-sm transition-transform group-hover:scale-105"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="font-bricolage text-xl font-bold tracking-tight mb-2">
                  Smart AI Teammate Matching
                </h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                  Connect solo engineers, designers, and domain experts using GitHub tech stack analysis, complementary skills, and automated skill compatibility scoring.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center gap-2 text-xs font-mono font-bold" style={{ color: "var(--accent)" }}>
                <span>94% MATCH ACCURACY</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2 */}
            <div
              className="p-6 rounded-[22px] transition-all hover:translate-y-[-3px] flex flex-col justify-between group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 shadow-sm transition-transform group-hover:scale-105"
                  style={{
                    background: "rgba(16, 185, 129, 0.14)",
                    color: "#10b981",
                  }}
                >
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="font-bricolage text-xl font-bold tracking-tight mb-2">
                  Offline-First QR Passes
                </h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                  High-speed attendee entry with encrypted QR tickets, emergency backup codes, and live check-in sync even in low-connectivity venue halls.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center gap-2 text-xs font-mono font-bold text-emerald-500">
                <span>SUB-SECOND GATE SCANNING</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div
              className="p-6 rounded-[22px] transition-all hover:translate-y-[-3px] flex flex-col justify-between group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 shadow-sm transition-transform group-hover:scale-105"
                  style={{
                    background: "rgba(245, 158, 11, 0.14)",
                    color: "#f59e0b",
                  }}
                >
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="font-bricolage text-xl font-bold tracking-tight mb-2">
                  Live Quiz & Engagement Arena
                </h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                  Host live interactive trivia, technical lightning rounds, and real-time audience polls with real-time WebSocket leaderboards and reward points.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center gap-2 text-xs font-mono font-bold text-amber-500">
                <span>REAL-TIME AUDIENCE VIBRANCY</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 4 */}
            <div
              className="p-6 rounded-[22px] transition-all hover:translate-y-[-3px] flex flex-col justify-between group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 shadow-sm transition-transform group-hover:scale-105"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bricolage text-xl font-bold tracking-tight mb-2">
                  Interactive Agendas & Schedule
                </h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                  Personalize attendee timelines with skill-tagged sessions, speaker bios, and one-click Google & iCal calendar synchronization.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center gap-2 text-xs font-mono font-bold" style={{ color: "var(--accent)" }}>
                <span>CALENDAR SYNC READY</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 5 */}
            <div
              className="p-6 rounded-[22px] transition-all hover:translate-y-[-3px] flex flex-col justify-between group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 shadow-sm transition-transform group-hover:scale-105"
                  style={{
                    background: "rgba(6, 182, 212, 0.14)",
                    color: "#06b6d4",
                  }}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bricolage text-xl font-bold tracking-tight mb-2">
                  Staff Command Center
                </h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                  Granular role-based permissions for Lead Organizers, Registration Desks, Mentors, and Judges with audit logs and 2FA protection.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center gap-2 text-xs font-mono font-bold text-cyan-500">
                <span>ROLE-BASED GOVERNANCE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 6 */}
            <div
              className="p-6 rounded-[22px] transition-all hover:translate-y-[-3px] flex flex-col justify-between group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 shadow-sm transition-transform group-hover:scale-105"
                  style={{
                    background: "rgba(244, 63, 94, 0.14)",
                    color: "#f43f5e",
                  }}
                >
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-bricolage text-xl font-bold tracking-tight mb-2">
                  Real-time Analytics
                </h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                  Monitor capacity utilization, ticket conversion, check-in velocity, and attendee demographics with exportable CSVs and post-event digests.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center gap-2 text-xs font-mono font-bold text-rose-500">
                <span>EXPORTABLE METRICS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 1.2 & TH5: INTERACTIVE ACCENT PALETTE SWITCHER
            ========================================================= */}
        <section id="palette" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--border)]">
          <div
            className="p-8 sm:p-12 rounded-[24px] flex flex-col md:flex-row items-center justify-between gap-8"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="space-y-2 text-left max-w-lg">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10.5px] font-bold uppercase tracking-wider"
                style={{
                  background: "var(--card2)",
                  border: "1px solid var(--border)",
                  color: "var(--accent)",
                }}
              >
                <span>ACCENT THEME ENGINE</span>
              </div>
              <h3 className="font-bricolage text-2xl sm:text-3xl font-black tracking-tight">
                Switch Your Eventrix Accent
              </h3>
              <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                Test our 6 switchable token pairs live on this page. All buttons, active indicators, and glows update seamlessly.
              </p>
            </div>

            {/* 6 Accent Swatches */}
            <div className="flex flex-wrap items-center gap-3">
              {ACCENT_OPTIONS.map((opt) => {
                const isActive = settings.accentColor === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSetting("accentColor", opt.id)}
                    className={`h-11 px-4 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2.5 cursor-pointer shadow-xs ${
                      isActive ? "ring-2 ring-offset-2 scale-105" : "hover:scale-102"
                    }`}
                    style={{
                      background: "var(--input)",
                      border: "1px solid var(--border)",
                      color: isActive ? "var(--text)" : "var(--muted)",
                      boxShadow: isActive ? `0 0 0 2px ${opt.color1}` : undefined,
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full shadow-xs"
                      style={{
                        background: `linear-gradient(135deg, ${opt.color1}, ${opt.color2})`,
                      }}
                    />
                    <span>{opt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 6.4: SPOTLIGHT / FINAL CTA BANNER
            ========================================================= */}
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-16">
          <div
            className="relative rounded-[24px] p-8 sm:p-14 overflow-hidden text-center flex flex-col items-center justify-center text-white"
            style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #09090b 100%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 24px 60px -20px var(--accent)",
            }}
          >
            {/* Grid Pattern Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                                   linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }}
            />

            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>EXPERIENCE EVENTRIX</span>
              </div>

              <h2 className="font-bricolage text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                Ready to elevate your next gathering?
              </h2>

              <p className="text-white/80 text-sm sm:text-base font-medium max-w-xl mx-auto leading-relaxed">
                Join thousands of creators, engineers, and organizers running real-time hackathons, summits, and local meetups.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto h-12 px-8 rounded-full text-sm font-bold !text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer shadow-xl"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    boxShadow: "0 8px 24px -8px var(--accent)",
                  }}
                >
                  <span>Create Account Free</span>
                  <ArrowRight className="w-4 h-4 !text-white" />
                </Link>

                <Link
                  href="/home"
                  className="w-full sm:w-auto h-12 px-7 rounded-full text-sm font-bold bg-white/10 hover:bg-white/15 border border-white/20 text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer backdrop-blur-md"
                >
                  <Compass className="w-4 h-4 text-white" />
                  <span>Browse Public Events</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 1.1 TOKENS & L2: FOOTER
            ========================================================= */}
        <footer
          className="relative z-10 w-full border-t border-[var(--border)] py-12 px-4 sm:px-8 transition-colors"
          style={{ background: "var(--chrome)" }}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Brand */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
              >
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5h14M5 12h9M5 19h14" />
                  <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span className="font-bricolage text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                Event<span style={{ color: "var(--accent)" }}>rix</span>
              </span>
              <span className="text-xs font-mono" style={{ color: "var(--subtle)" }}>
                — The Next-Gen Event Operating System
              </span>
            </div>

            {/* Middle: System Status */}
            <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "var(--muted)" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>All Systems Operational</span>
              <span className="text-[var(--subtle)]">•</span>
              <span>TLS 1.3 Encrypted</span>
            </div>

            {/* Right: Copyright */}
            <div className="text-xs font-mono" style={{ color: "var(--subtle)" }}>
              © 2026 Eventrix. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </PageTransition>
  );
}
