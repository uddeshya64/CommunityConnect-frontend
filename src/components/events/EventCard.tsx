"use client";

import React from "react";
import Link from "next/link";
import { Bookmark, MapPin, Zap, ShieldCheck, Radio } from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";

export interface EventCardProps {
  id: string;
  title: string;
  category?: string;
  mode?: string;
  date?: string;
  endDate?: string | null;
  location?: string;
  city?: string;
  fee?: string;
  reg?: number;
  cap?: number;
  pct?: string;
  regLabel?: string;
  match?: string;
  staffRoleName?: string;
  relationshipBadge?: "Admin" | "Staff" | "Participant" | string;
  statusBadge?: "upcoming" | "live" | "concluded" | string;
  photo?: string;
  bannerUrl?: string | null;
  isSaved?: boolean;
  onToggleSave?: (id: string, e: React.MouseEvent) => void;
  href?: string;
  className?: string;
}

const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop",
];

function parseCardDate(dateStr?: string) {
  if (!dateStr) return { day: "15", mon: "NOV" };
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return {
      day: String(d.getDate()).padStart(2, "0"),
      mon: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    };
  }
  const parts = dateStr.trim().split(/[\s,·•-]+/);
  const day = parts.find((p) => /^\d{1,2}$/.test(p)) || "15";
  const mon =
    parts.find(
      (p) =>
        /^[A-Za-z]{3,4}$/.test(p) &&
        !["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].includes(p)
    ) || "NOV";
  return { day: day.padStart(2, "0"), mon: mon.toUpperCase() };
}

export default function EventCard({
  id,
  title,
  category = "Hackathon",
  mode = "Hybrid",
  date,
  location = "Bengaluru",
  city,
  fee = "Free",
  reg,
  cap,
  pct: propPct,
  regLabel: propRegLabel,
  match,
  staffRoleName,
  relationshipBadge,
  statusBadge,
  photo,
  bannerUrl,
  isSaved = false,
  onToggleSave,
  href = `/events/${id}`,
  className = "",
}: EventCardProps) {
  const { activeAccent } = useAppearance();

  const dateObj = parseCardDate(date);
  const displayCity = city || location?.split(/[•·,]/)[0]?.trim() || "Bengaluru";

  // Compute capacity progress
  let pct = propPct;
  let regLabel = propRegLabel;
  if (!pct && typeof reg === "number" && typeof cap === "number" && cap > 0) {
    const calcPct = Math.min(100, Math.round((reg / cap) * 100));
    pct = `${calcPct}%`;
    regLabel = `${reg} / ${cap}`;
  } else if (!pct && typeof reg === "number") {
    pct = cap && cap > 0 ? `${Math.min(100, Math.round((reg / cap) * 100))}%` : "0%";
    regLabel = cap ? `${reg} / ${cap}` : `${reg} registered`;
  } else if (!pct) {
    pct = "0%";
    regLabel = regLabel || "0 / 100";
  }

  // Choose fallback cover
  const imageCover =
    photo ||
    bannerUrl ||
    DEFAULT_PHOTOS[
      Math.abs(
        title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      ) % DEFAULT_PHOTOS.length
    ];

  return (
    <Link
      href={href}
      className={`cc-event-card group relative ${className}`}
    >
      {/* 16:9 Cover Banner */}
      <div className="aspect-[16/9] w-full relative overflow-hidden bg-zinc-900 p-3 flex flex-col justify-between">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
          style={{ backgroundImage: `url(${imageCover})` }}
        />
        {/* Cinematic Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45 pointer-events-none" />

        {/* Top Floating Row */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          {/* Calendar Day Badge */}
          <div
            className="w-11 rounded-[10px] text-center py-1 shrink-0 shadow-md transition-transform group-hover:scale-105"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              color: "#0f172a",
              boxShadow: "0 6px 16px -6px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div className="text-[9.5px] font-bold tracking-wider text-rose-500 uppercase leading-none">
              {dateObj.mon}
            </div>
            <div className="text-[18px] font-extrabold leading-tight mt-0.5">
              {dateObj.day}
            </div>
          </div>

          {/* Right Action Icons & Badges */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {relationshipBadge && (
              <span
                className="h-6 px-2.5 rounded-full backdrop-blur-md text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm border"
                style={
                  relationshipBadge.toLowerCase().includes("admin")
                    ? {
                        background: "rgba(16, 185, 129, 0.2)",
                        borderColor: "rgba(16, 185, 129, 0.4)",
                        color: "#34d399",
                      }
                    : relationshipBadge.toLowerCase().includes("staff")
                    ? {
                        background: "rgba(168, 85, 247, 0.2)",
                        borderColor: "rgba(168, 85, 247, 0.4)",
                        color: "#c084fc",
                      }
                    : {
                        background: "rgba(59, 130, 246, 0.2)",
                        borderColor: "rgba(59, 130, 246, 0.4)",
                        color: "#60a5fa",
                      }
                }
              >
                <ShieldCheck className="w-3 h-3" />
                <span>{relationshipBadge}</span>
              </span>
            )}

            {staffRoleName && !relationshipBadge && (
              <span className="h-6 px-2.5 rounded-full bg-purple-600/90 backdrop-blur-md text-white text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" />
                <span>{staffRoleName}</span>
              </span>
            )}

            {statusBadge === "live" && (
              <span className="h-6 px-2.5 rounded-full bg-rose-600/95 backdrop-blur-md text-white text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>Live Now</span>
              </span>
            )}

            {statusBadge === "concluded" && (
              <span className="h-6 px-2.5 rounded-full bg-zinc-800/90 backdrop-blur-md text-zinc-300 border border-white/10 text-[10.5px] font-bold uppercase tracking-wider flex items-center shadow-sm">
                Concluded
              </span>
            )}

            {match && (
              <span className="h-6 px-2.5 rounded-full bg-zinc-950/75 backdrop-blur-md border border-white/15 text-amber-300 text-[11px] font-bold flex items-center gap-1 shadow-sm">
                <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
                <span>{match}</span>
              </span>
            )}

            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => onToggleSave(id, e)}
                title={isSaved ? "Remove from saved" : "Save event"}
                className="w-8 h-8 rounded-[10px] border border-white/20 bg-black/35 backdrop-blur-md flex items-center justify-center transition-all hover:bg-black/60 cursor-pointer shadow-sm"
              >
                <Bookmark
                  className={`w-4 h-4 transition-colors ${
                    isSaved ? "fill-amber-400 text-amber-400" : "text-white"
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Metadata Badges */}
        <div className="relative z-10 flex items-center gap-1.5 flex-wrap">
          <span className="h-6 px-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold flex items-center">
            {category}
          </span>
          <span className="h-6 px-2.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span>{mode}</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-4.5 flex flex-col flex-1 gap-2.5">
        <h4
          className="font-bricolage text-[18px] sm:text-[19px] font-bold tracking-tight line-clamp-1 transition-colors"
          style={{ color: "var(--text)" }}
        >
          {title}
        </h4>

        <div
          className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "var(--muted)" }}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--subtle)" }} />
          <span className="truncate">{displayCity}</span>
        </div>

        {/* Capacity Progress Bar */}
        <div
          className="h-1.5 w-full rounded-full overflow-hidden mt-auto"
          style={{ background: "var(--card2)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: pct,
              background: `linear-gradient(90deg, var(--accent), var(--accent2))`,
            }}
          />
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between text-xs pt-1 font-medium">
          <span style={{ color: "var(--subtle)" }}>
            {regLabel} registered
          </span>
          <span className="font-bold" style={{ color: "var(--text)" }}>
            {fee}
          </span>
        </div>
      </div>
    </Link>
  );
}

