"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { hasStoredSession } from "@/lib/auth";
import RoleShowcase from "@/components/landing/RoleShowcase";
import VideoTourSection from "@/components/landing/VideoTourSection";
import {
  FEATURES,
  MARQUEE_WORDS,
  PLATFORM_STATS,
  QR7,
} from "@/components/landing/landingData";

const COUNTDOWN_TARGET_MS = new Date("2026-11-15T09:00:00+05:30").getTime();

const pad = (n: number) => String(n).padStart(2, "0");

const emptySubscribe = () => () => { };
const subscribeToStorage = (onChange: () => void) => {
  if (typeof window === "undefined") return () => { };
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

export default function LandingPage() {
  const { isDark, toggleTheme } = useAppearance();
  const router = useRouter();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const isLoggedIn = useSyncExternalStore(
    subscribeToStorage,
    () => hasStoredSession(),
    () => false
  );

  // Interactive section state
  const [activeFeature, setActiveFeature] = useState(0);

  // Deterministic initial values for SSR; ticked client-side in useEffect
  const [countdown, setCountdown] = useState({
    days: "02",
    hrs: "21",
    min: "00",
    sec: "00",
  });
  const [liveTelemetry, setLiveTelemetry] = useState<[number, number, number, number]>([
    18412,
    1236,
    90211,
    24,
  ]);

  const passRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const diff = Math.max(0, COUNTDOWN_TARGET_MS - Date.now());
      const dd = Math.floor(diff / 86_400_000);
      const hh = Math.floor(diff / 3_600_000) % 24;
      const mm = Math.floor(diff / 60_000) % 60;
      const ss = Math.floor(diff / 1_000) % 60;
      setCountdown({
        days: pad(dd),
        hrs: pad(hh),
        min: pad(mm),
        sec: pad(ss),
      });
    };

    const initTimer = setTimeout(updateClock, 0);
    const secIv = setInterval(updateClock, 1000);
    const pulseIv = setInterval(() => {
      setLiveTelemetry((prev) => [
        prev[0] + Math.ceil(Math.random() * 4),
        prev[1] + (Math.random() < 0.3 ? 1 : 0),
        prev[2] + Math.ceil(Math.random() * 12),
        prev[3],
      ]);
    }, 1400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/discover");
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(initTimer);
      clearInterval(secIv);
      clearInterval(pulseIv);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  const handleHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    const pass = passRef.current;
    if (!pass) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    pass.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 18}deg)`;
    if (sheenRef.current) {
      sheenRef.current.style.background = `radial-gradient(circle at ${50 + x * 120}% ${50 + y * 120
        }%, oklch(1 0 0 / 0.6), transparent 45%)`;
    }
  };

  const handleHeroLeave = () => {
    if (passRef.current) {
      passRef.current.style.transform = "rotateY(-8deg) rotateX(4deg)";
    }
  };

  const handleCtaMove = (e: React.MouseEvent<HTMLElement>) => {
    const spot = spotRef.current;
    if (!spot) return;
    const r = e.currentTarget.getBoundingClientRect();
    spot.style.transform = `translate(${e.clientX - r.left - r.width / 2}px, ${e.clientY - r.top - r.height / 2
      }px)`;
  };

  const liveCards = [
    {
      label: "CHECK-INS TODAY",
      value: liveTelemetry[0].toLocaleString("en-IN"),
      sub: "across all live events",
      dot: "oklch(0.64 0.16 155)",
    },
    {
      label: "TEAMS FORMED",
      value: liveTelemetry[1].toLocaleString("en-IN"),
      sub: "via AI matching this month",
      dot: "var(--etx-accent)",
    },
    {
      label: "QUIZ ANSWERS",
      value: liveTelemetry[2].toLocaleString("en-IN"),
      sub: "in live arenas right now",
      dot: "oklch(0.75 0.15 300)",
    },
    {
      label: "EVENTS LIVE",
      value: String(liveTelemetry[3]),
      sub: "in 18 global hubs",
      dot: "oklch(0.78 0.16 40)",
    },
  ];

  return (
    <PageTransition>
      <div
        data-etx="1"
        className="min-h-screen w-full relative overflow-x-clip transition-colors duration-300"
        style={{
          backgroundColor: "var(--bg)",
          backgroundImage:
            "radial-gradient(ellipse 68% 45% at 78% 12%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 72%), radial-gradient(ellipse 52% 40% at 15% 22%, color-mix(in oklab, var(--accent2) 14%, transparent), transparent 70%)",
          backgroundRepeat: "no-repeat",
          color: "var(--text)",
        }}
      >
        {/* =========================================================
            FLOATING FROSTED PILL NAVBAR (EVENTRIX LOGO & THEME/ACCENT)
            ========================================================= */}
        <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-3 sm:px-4 pointer-events-none">
          <div
            className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 p-2 pl-3.5 sm:pl-4 rounded-full max-w-full border"
            style={{
              background: "var(--chrome)",
              backdropFilter: "blur(24px) saturate(1.4)",
              WebkitBackdropFilter: "blur(24px) saturate(1.4)",
              borderColor: "var(--border)",
              boxShadow: isDark
                ? "0 12px 32px -8px rgba(0, 0, 0, 0.55)"
                : "0 10px 28px -8px rgba(15, 23, 42, 0.1)",
            }}
          >
            <Link
              href="/"
              className="flex items-center gap-2.5 mr-1 sm:mr-3 shrink-0 group"
              title="Eventrix Home"
            >
              <div
                className="w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center text-white font-extrabold text-sm shadow-md transition-transform group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  boxShadow: "0 6px 18px -6px var(--accent)",
                }}
              >
                <svg
                  className="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 5h14M5 12h9M5 19h14" />
                  <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span
                className="font-bricolage text-[17px] font-bold tracking-tight whitespace-nowrap"
                style={{ color: "var(--text)" }}
              >
                Event<span style={{ color: "var(--accent)" }}>rix</span>
              </span>
            </Link>

            <nav
              className="hidden md:flex items-center gap-0.5 text-[14px] font-medium"
              style={{ color: "var(--muted)" }}
            >
              {[
                { href: "#roles", label: "Product" },
                { href: "#features", label: "Features" },
                { href: "#tour", label: "Tour" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-full transition-colors hover:bg-[color-mix(in_oklab,var(--text)_7%,transparent)]"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <button
              type="button"
              onClick={toggleTheme}
              title="Toggle theme"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap border transition-colors hover:opacity-85"
              style={{
                background: "var(--input)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              {mounted ? (
                isDark ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                )
              ) : (
                <Sun className="w-3.5 h-3.5 opacity-60" />
              )}
              <span className="hidden sm:inline">
                {mounted ? (isDark ? "Light" : "Dark") : "Theme"}
              </span>
            </button>

            {mounted && isLoggedIn ? (
              <>
                <Link
                  href="/events/create"
                  className="hidden sm:inline-block text-[13px] font-medium px-3 py-1.5 whitespace-nowrap transition-opacity hover:opacity-80"
                  style={{ color: "var(--muted)" }}
                >
                  Host
                </Link>
                <Link
                  href="/home"
                  className="text-[13px] sm:text-[14px] font-semibold px-4 sm:px-[18px] py-2 rounded-full whitespace-nowrap text-white transition-transform hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    boxShadow: "0 6px 18px -6px var(--accent)",
                  }}
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[13px] sm:text-[14px] font-medium px-2.5 sm:px-3 py-1.5 whitespace-nowrap transition-opacity hover:opacity-80"
                  style={{ color: "var(--muted)" }}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-[13px] sm:text-[14px] font-semibold px-4 sm:px-[18px] py-2 rounded-full whitespace-nowrap text-white transition-transform hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    boxShadow: "0 6px 18px -6px var(--accent)",
                  }}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </header>

        {/* =========================================================
            HERO SECTION + 3D EVENTRIX PASS + MARQUEE
            ========================================================= */}
        <section
          onMouseMove={handleHeroMove}
          onMouseLeave={handleHeroLeave}
          className="relative min-h-screen pt-[108px] sm:pt-[132px] lg:pt-[150px] pb-10 px-4 sm:px-6 flex flex-col justify-center"
        >
          <div className="relative max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-14 items-center">
            {/* Left Copy & Countdown */}
            <div className="lg:col-span-7 text-center lg:text-left flex flex-col items-center lg:items-start">
              <h1
                className="font-bricolage text-[clamp(38px,10vw,88px)] sm:text-[clamp(44px,6.4vw,88px)] leading-[1.02] lg:leading-[0.98] tracking-tight font-extrabold text-balance"
                style={{ color: "var(--text)" }}
              >
                Host events people{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  }}
                >
                  can&apos;t stop
                </span>{" "}
                talking about.
              </h1>

              <p
                className="text-[clamp(15px,3.8vw,19px)] sm:text-[clamp(16px,1.35vw,19px)] leading-[1.6] max-w-[520px] mx-auto lg:mx-0 mt-5 sm:mt-6 text-pretty"
                style={{ color: "var(--muted)" }}
              >
                Hackathons, summits and meetups — built by AI in minutes, themed like a brand,
                checked-in in under a second. Even when the Wi-Fi dies.
              </p>

              <div className="flex gap-3 mt-7 sm:mt-8 flex-wrap justify-center lg:justify-start">
                <Link
                  href="/events/create/ai"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-semibold text-[15px] text-white whitespace-nowrap transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    boxShadow: "0 14px 36px -10px color-mix(in oklab, var(--accent) 65%, transparent)",
                  }}
                >
                  <span>Host with AI</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/home"
                  className="px-6 py-3.5 rounded-full font-semibold text-[15px] whitespace-nowrap border transition-colors hover:opacity-85"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  Explore live events
                </Link>
              </div>

              {/* Countdown */}
              <div className="mt-10 sm:mt-12 w-full max-w-[380px] lg:max-w-none mx-auto lg:mx-0">
                <div
                  className="font-mono text-[11px] font-bold tracking-[0.14em]"
                  style={{ color: "var(--subtle)" }}
                >
                  T-MINUS · BUILDCON AI HACKATHON
                </div>
                <div className="grid grid-cols-4 sm:flex sm:justify-center lg:justify-start gap-2 sm:gap-2.5 mt-3">
                  {[
                    { v: countdown.days, l: "DAYS" },
                    { v: countdown.hrs, l: "HRS" },
                    { v: countdown.min, l: "MIN" },
                    { v: countdown.sec, l: "SEC" },
                  ].map((cd) => (
                    <div
                      key={cd.l}
                      className="sm:min-w-[76px] px-2 sm:px-3.5 py-2.5 sm:py-3 rounded-2xl border backdrop-blur-xl text-center lg:text-left"
                      style={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="font-bricolage text-[24px] sm:text-[28px] font-extrabold tracking-tight tabular-nums leading-none">
                        {cd.v}
                      </div>
                      <div
                        className="font-mono text-[10px] font-semibold tracking-[0.12em] mt-1.5"
                        style={{ color: "var(--subtle)" }}
                      >
                        {cd.l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Interactive 3D Eventrix Pass */}
            <div className="lg:col-span-5 flex justify-center py-5 [perspective:1200px]">
              <div style={{ animation: "etx-floaty 6s ease-in-out infinite" }}>
                <div
                  ref={passRef}
                  className="relative w-[min(360px,86vw)] rounded-[28px] overflow-hidden border transition-transform duration-200 ease-out"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                    transformStyle: "preserve-3d",
                    boxShadow: "0 40px 100px -24px var(--etx-shadow)",
                  }}
                >
                  <div
                    ref={sheenRef}
                    className="absolute inset-0 pointer-events-none z-[2]"
                    style={{
                      background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.45), transparent 45%)",
                      mixBlendMode: "soft-light",
                    }}
                  />

                  <div
                    className="p-5 pb-4 sm:p-[26px] sm:pb-[22px] text-white"
                    style={{
                      background: "linear-gradient(145deg, var(--accent), var(--accent2))",
                    }}
                  >
                    <div className="flex justify-between items-center font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.12em] opacity-90">
                      <span>EVENTRIX PASS</span>
                      <span>№ 0142</span>
                    </div>
                    <div className="font-bricolage font-extrabold text-[30px] sm:text-[38px] leading-[1.02] tracking-tight mt-5 sm:mt-6">
                      BuildCon
                      <br />
                      AI Hackathon
                    </div>
                    <div className="text-[12px] sm:text-[13px] mt-2 sm:mt-2.5 font-medium opacity-90">
                      KTPO Convention Centre, Bengaluru
                    </div>
                  </div>

                  {/* Perforated Notch Divider */}
                  <div
                    className="relative h-0"
                    style={{ borderTop: "2px dashed var(--border)" }}
                  >
                    <div
                      className="absolute -left-3.5 -top-3.5 w-7 h-7 rounded-full border"
                      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                    />
                    <div
                      className="absolute -right-3.5 -top-3.5 w-7 h-7 rounded-full border"
                      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                    />
                  </div>

                  <div className="p-5 sm:p-[22px_26px_26px]">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                      <div className="min-w-0">
                        <div className="font-mono text-[9.5px] sm:text-[10px] font-semibold tracking-[0.1em]" style={{ color: "var(--subtle)" }}>
                          DATE
                        </div>
                        <div className="font-semibold text-[13.5px] sm:text-[15px] mt-0.5 truncate">15 Nov</div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-[9.5px] sm:text-[10px] font-semibold tracking-[0.1em]" style={{ color: "var(--subtle)" }}>
                          GATE
                        </div>
                        <div className="font-semibold text-[13.5px] sm:text-[15px] mt-0.5 truncate">B · 09:00</div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-[9.5px] sm:text-[10px] font-semibold tracking-[0.1em]" style={{ color: "var(--subtle)" }}>
                          TEAM
                        </div>
                        <div className="font-semibold text-[13.5px] sm:text-[15px] mt-0.5 truncate">#42</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end mt-5 sm:mt-[22px] gap-3 sm:gap-4">
                      <div className="min-w-0">
                        <div className="font-mono text-[9.5px] sm:text-[10px] font-semibold tracking-[0.1em]" style={{ color: "var(--subtle)" }}>
                          ATTENDEE
                        </div>
                        <div className="font-bricolage font-bold text-[17px] sm:text-[20px] tracking-tight mt-0.5 truncate">
                          Uddeshya Patidar
                        </div>
                        <div className="text-[11px] sm:text-[12px] mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                          Participant · Full-stack
                        </div>
                        <div
                          className="inline-flex items-center gap-1.5 mt-3 font-mono text-[9.5px] sm:text-[10px] font-bold tracking-[0.08em] px-2.5 py-1 rounded-full border"
                          style={{
                            background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                            borderColor: "color-mix(in oklab, var(--accent) 28%, transparent)",
                            color: "var(--accent)",
                          }}
                        >
                          <span
                            className="w-[5px] h-[5px] rounded-full"
                            style={{ background: "var(--accent)" }}
                          />
                          WORKS OFFLINE
                        </div>
                      </div>

                      <div className="w-20 h-20 sm:w-24 sm:h-24 grid grid-cols-7 gap-0.5 shrink-0">
                        {QR7.map((q, i) => (
                          <div
                            key={i}
                            className="rounded-[1.5px]"
                            style={{ background: q ? "var(--text)" : "transparent" }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Infinite App-Aligned Marquee */}
          <div
            className="relative mt-[72px] py-[22px] overflow-hidden border-y"
            style={{
              borderColor: "var(--border)",
              maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
              WebkitMaskImage:
                "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
            }}
          >
            <div
              className="flex w-max"
              style={{ animation: "etx-marquee 38s linear infinite" }}
            >
              {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, idx) => (
                <div key={`${word}-${idx}`} className="flex items-center gap-9 pr-9 whitespace-nowrap">
                  <span className="font-bricolage text-[clamp(26px,2.8vw,40px)] font-bold tracking-tight">
                    {word}
                  </span>
                  <span
                    className="font-bricolage text-[clamp(24px,2.5vw,34px)] font-bold"
                    style={{ color: "var(--accent)" }}
                  >
                    ✳
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            LIVE TELEMETRY PULSE BAR
            ========================================================= */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-14 sm:pb-[96px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {liveCards.map((lv) => (
              <div
                key={lv.label}
                className="cc-event-card px-4 py-4 sm:px-6 sm:py-[22px]"
              >
                <div
                  className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.08em] sm:tracking-[0.1em]"
                  style={{ color: "var(--subtle)" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                    style={{ background: lv.dot }}
                  />
                  <span className="truncate">{lv.label}</span>
                </div>
                <div className="font-bricolage text-[28px] sm:text-[40px] font-extrabold tracking-tight mt-2.5 sm:mt-3 tabular-nums leading-none">
                  {lv.value}
                </div>
                <div className="text-[12px] sm:text-[13px] mt-1.5 sm:mt-2" style={{ color: "var(--muted)" }}>
                  {lv.sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            ONE OS · THREE ROLES INTERACTIVE SHOWCASE
            ========================================================= */}
        <RoleShowcase />

        {/* =========================================================
            STICKY PLATFORM FEATURES ACCORDION
            ========================================================= */}
        <section id="features" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-14 sm:py-[100px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-[110px] text-center lg:text-left">
              <div
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--accent)" }}
              >
                PLATFORM
              </div>
              <h2 className="font-bricolage text-[clamp(34px,8vw,62px)] sm:text-[clamp(38px,4.5vw,62px)] leading-[1.02] lg:leading-[0.98] tracking-[-0.04em] font-extrabold mt-3 sm:mt-4 text-balance">
                Built for{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  high-stakes
                </span>{" "}
                rooms.
              </h2>
              <p
                className="text-[15px] sm:text-[16px] leading-[1.6] mt-4 sm:mt-5 max-w-[380px] mx-auto lg:mx-0"
                style={{ color: "var(--muted)" }}
              >
                Offline-first, role-aware and real-time by default — so the event runs even when
                everything else doesn&apos;t.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-3">
              {FEATURES.map((f, idx) => {
                const isOpen = idx === activeFeature;
                return (
                  <div
                    key={f.title}
                    onMouseEnter={() => setActiveFeature(idx)}
                    onClick={() => setActiveFeature(idx)}
                    className="rounded-2xl px-5 py-5 cursor-pointer transition-all duration-300"
                    style={{
                      background: isOpen ? "var(--card)" : "transparent",
                      border: `1px solid ${isOpen
                        ? "color-mix(in oklab, var(--accent) 32%, var(--border))"
                        : "var(--border)"
                        }`,
                    }}
                  >
                    <div className="flex items-baseline gap-4">
                      <span
                        className="font-mono text-[12px] font-semibold transition-colors duration-300"
                        style={{ color: isOpen ? "var(--accent)" : "var(--subtle)" }}
                      >
                        {pad(idx + 1)}
                      </span>
                      <span
                        className="font-bricolage flex-1 text-[clamp(20px,2.1vw,28px)] font-bold tracking-[-0.025em] transition-colors duration-300"
                        style={{ color: isOpen ? "var(--text)" : "var(--muted)" }}
                      >
                        {f.title}
                      </span>
                      <span
                        className="font-mono text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap px-2.5 py-1 rounded-full"
                        style={{
                          background: isOpen
                            ? "color-mix(in oklab, var(--accent) 14%, transparent)"
                            : "var(--card2)",
                          color: isOpen ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {f.tag}
                      </span>
                    </div>

                    <div
                      className="grid transition-[grid-template-rows] duration-400 ease-out"
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <p
                          className="mt-3 ml-8 sm:ml-9 text-[15px] leading-[1.6] max-w-[540px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {f.body}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            PLATFORM METRICS BAR
            ========================================================= */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-6 sm:pt-[40px] pb-14 sm:pb-[100px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {PLATFORM_STATS.map((s) => (
              <div
                key={s.label}
                className="cc-event-card rounded-2xl sm:rounded-3xl p-5 sm:p-7"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="font-bricolage text-[clamp(36px,9vw,78px)] sm:text-[clamp(52px,5.8vw,78px)] font-extrabold leading-[0.9] tracking-[-0.04em] tabular-nums"
                  style={{ color: "var(--text)" }}
                >
                  {s.value}
                </div>
                <div className="font-semibold text-[14px] sm:text-[15px] mt-3 sm:mt-4" style={{ color: "var(--text)" }}>
                  {s.label}
                </div>
                <div className="font-mono text-[11px] sm:text-[12px] mt-1" style={{ color: "var(--muted)" }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            INTERACTIVE MULTI-VIDEO TOUR (ALL 4 FRONTEND VIDEOS PRESERVED)
            ========================================================= */}
        <VideoTourSection />

        {/* =========================================================
            MAGNETIC SPOTLIGHT CTA BANNER
            ========================================================= */}
        <section
          onMouseMove={handleCtaMove}
          className="relative max-w-[1280px] mx-auto px-6"
        >
          <div
            className="relative rounded-[32px] overflow-hidden text-center"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              color: "#ffffff",
              padding: "clamp(60px, 9vw, 124px) 24px",
              boxShadow: "0 24px 60px color-mix(in oklab, var(--accent) 28%, transparent)",
            }}
          >
            <div
              ref={spotRef}
              className="absolute w-[700px] h-[700px] left-1/2 top-1/2 -ml-[350px] -mt-[350px] rounded-full pointer-events-none transition-transform duration-200 ease-out"
              style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.24), transparent)" }}
            />
            <div className="relative">
              <div className="font-mono text-[12px] font-semibold tracking-[0.14em] opacity-90">
                FREE TO START · NO CARD NEEDED
              </div>
              <h2 className="font-bricolage text-[clamp(48px,8vw,124px)] leading-[0.92] tracking-[-0.045em] font-extrabold mt-[20px] mx-auto max-w-[980px]">
                Your next event starts{" "}
                <span className="opacity-90 underline decoration-white/35 decoration-2 underline-offset-8">
                  here.
                </span>
              </h2>
              <div className="flex gap-3 justify-center mt-10 flex-wrap">
                <Link
                  href="/register"
                  className="px-7 py-4 rounded-2xl font-bold text-[15px] whitespace-nowrap transition-transform hover:scale-[1.02] shadow-lg"
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                  }}
                >
                  Create free account →
                </Link>
                <Link
                  href="/home"
                  className="px-7 py-4 rounded-2xl font-semibold text-[15px] whitespace-nowrap transition-colors hover:bg-white/15"
                  style={{
                    border: "1.5px solid rgba(255,255,255,0.5)",
                    color: "#ffffff",
                    background: "rgba(255,255,255,0.08)",
                  }}
                >
                  Browse public events
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            MINIMAL OPERATIONAL FOOTER + WORDMARK
            ========================================================= */}
        <footer className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-12 sm:pt-[68px] pb-10">
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5 text-[13px] pb-6"
            style={{
              color: "var(--muted)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                }}
              >
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 6h16M4 12h10m-10 6h16"
                  />
                  <circle cx="19" cy="12" r="2" fill="currentColor" />
                </svg>
              </div>
              <span className="font-bricolage text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                Event<span style={{ color: "var(--accent)" }}>rix</span>
              </span>
            </div>
            <div className="flex gap-5 font-medium">
              <Link href="/home" className="hover:opacity-80">
                Events
              </Link>
              <Link href="/events/create/ai" className="hover:opacity-80">
                Host
              </Link>
              <Link href="/login" className="hover:opacity-80">
                Log in
              </Link>
            </div>
          </div>

          <div
            className="font-bricolage text-[clamp(64px,19vw,280px)] font-extrabold tracking-[-0.065em] leading-[0.85] mt-8 sm:mt-10 text-center select-none overflow-hidden"
            style={{ color: "color-mix(in oklab, var(--text) 7%, transparent)" }}
          >
            Eventrix
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
