"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Share2,
  Calendar,
  MapPin,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Send,
} from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";

export interface ShareEventData {
  id: string | number;
  title: string;
  description?: string | null;
  banner_url?: string | null;
  start_date?: string | null;
  location?: string | null;
  mode?: string | null;
  category?: string | null;
  url?: string;
}

export interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ShareEventData | null;
}

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop";

export default function ShareEventModal({
  isOpen,
  onClose,
  event,
}: ShareEventModalProps) {
  const { activeAccent } = useAppearance();
  const [copied, setCopied] = useState(false);

  // Compute clean share URL
  const shareUrl = useMemo(() => {
    if (!event) return "";
    if (event.url) return event.url;
    if (typeof window !== "undefined") {
      return `${window.location.origin}/events/${event.id}`;
    }
    return `/events/${event.id}`;
  }, [event]);

  // Clean description without HTML tags
  const cleanDescription = useMemo(() => {
    if (!event?.description) return "Join this event on Eventrix!";
    const text = event.description.replace(/<[^>]*>?/gm, "").trim();
    return text || "Join this event on Eventrix!";
  }, [event?.description]);

  // Formatted Date
  const formattedDate = useMemo(() => {
    if (!event?.start_date || /^(tba|coming\s*soon)$/i.test(String(event.start_date).trim())) {
      return "Coming Soon (Dates TBA)";
    }
    const d = new Date(event.start_date);
    if (isNaN(d.getTime())) return "Coming Soon (Dates TBA)";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [event]);

  // Choose banner image
  const bannerImage = event?.banner_url || DEFAULT_BANNER;

  // Copy Link Handler
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Native Web Share Handler
  const handleNativeShare = async () => {
    if (!event || typeof window === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title: event.title,
        text: cleanDescription.slice(0, 160),
        url: shareUrl,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Error sharing via native share:", err);
      }
    }
  };

  // Social Share URLs & Text formatted for rich link preview unfurling
  const encodedUrl = encodeURIComponent(shareUrl);
  const formattedWhatsAppMsg = encodeURIComponent(
    `*${event?.title || "Event"}*\n${cleanDescription.slice(0, 120)}...\n\n${shareUrl}`
  );
  const twitterText = encodeURIComponent(
    `Check out "${event?.title || "Event"}" on Eventrix!\n${cleanDescription.slice(0, 100)}...`
  );

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.896.907 2.796.907 3.182 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.768-5.768-5.768zm3.393 8.354c-.149.42-1.026.837-1.421.893-.396.056-.789.074-2.285-.544-1.785-.738-2.923-2.548-3.011-2.668-.088-.121-.724-.962-.724-1.833 0-.871.458-1.299.621-1.476.163-.177.355-.223.474-.223.118 0 .237.002.341.008.109.006.257-.041.401.306.149.362.51 1.246.554 1.336.045.09.075.195.015.314-.06.119-.09.193-.178.297-.089.104-.188.232-.268.312-.09.09-.184.187-.079.367.105.18.468.772.997 1.246.684.611 1.26.8 1.44.89.179.09.284.075.389-.045.105-.12.449-.523.568-.702.12-.18.239-.149.403-.09.164.06 1.04.49 1.219.58.179.09.298.135.343.21.045.075.045.435-.104.855z" />
        </svg>
      ),
      color: "hover:bg-[#25D366]/15 hover:text-[#25D366] hover:border-[#25D366]/30",
      url: `https://api.whatsapp.com/send?text=${formattedWhatsAppMsg}`,
    },
    {
      name: "X (Twitter)",
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: "hover:bg-zinc-500/15 hover:text-white hover:border-zinc-500/30",
      url: `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodedUrl}`,
    },
    {
      name: "LinkedIn",
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m1.37 9.74v-8.37H5.1v8.37h2.73z" />
        </svg>
      ),
      color: "hover:bg-[#0A66C2]/15 hover:text-[#0A66C2] hover:border-[#0A66C2]/30",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "Telegram",
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .36z" />
        </svg>
      ),
      color: "hover:bg-[#229ED9]/15 hover:text-[#229ED9] hover:border-[#229ED9]/30",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(event?.title || "Event")}`,
    },
  ];

  const hasNativeShare = typeof window !== "undefined" && typeof navigator !== "undefined" && !!navigator.share;

  return (
    <AnimatePresence>
      {isOpen && event && (
        <motion.div
          key="share-event-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            key="share-event-modal-content"
            initial={{ scale: 0.94, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 14, opacity: 0 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[26px] overflow-hidden border shadow-2xl relative my-auto"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
              style={{
                background: "rgba(0, 0, 0, 0.45)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Event Preview Banner Image */}
            <div className="relative aspect-[16/8] w-full overflow-hidden bg-zinc-900 group">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${bannerImage})` }}
              />
              {/* Scrim Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none" />

              {/* Floating Badges on Banner */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="h-6 px-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[11px] font-mono font-semibold tracking-wider text-white uppercase inline-flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  {event.category || "Event"}
                </span>
                {event.mode && (
                  <span className="h-6 px-2.5 rounded-full bg-emerald-500/30 backdrop-blur-md border border-emerald-400/40 text-[11px] font-semibold text-emerald-200 uppercase inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{event.mode}</span>
                  </span>
                )}
              </div>

              {/* Banner Footer Text */}
              <div className="absolute bottom-3 left-4 right-4 z-10">
                <div
                  className="text-white text-[18px] sm:text-[20px] font-bold tracking-tight line-clamp-1 leading-snug drop-shadow-md"
                  style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                >
                  {event.title}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              {/* Metadata row */}
              <div
                className="flex items-center gap-3 text-[12px] flex-wrap pb-3 border-b"
                style={{ borderColor: "var(--border)", color: "var(--subtle)" }}
              >
                {formattedDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    <span className="font-medium">{formattedDate}</span>
                  </div>
                )}
                {event.location && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-zinc-500/50" />
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Event Description Card */}
              <div
                className="p-3.5 rounded-2xl border text-[13px] leading-relaxed flex flex-col gap-1"
                style={{
                  background: "var(--input)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                }}
              >
                <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--subtle)]">
                  Event Description
                </div>
                <div className="line-clamp-3 whitespace-pre-line text-[var(--text)] text-opacity-90">
                  {cleanDescription}
                </div>
              </div>

              {/* Copy Share Link Input Field */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[12px] font-semibold text-[var(--subtle)]">
                  Event Link
                </label>
                <div
                  className="flex items-center gap-2 p-1.5 pl-3 rounded-xl border transition-all"
                  style={{
                    background: "var(--card2)",
                    borderColor: "var(--border)",
                  }}
                >
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 bg-transparent text-[12.5px] font-mono text-[var(--text)] outline-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 text-white shadow-xs shrink-0"
                    style={{
                      background: copied
                        ? "#10b981"
                        : "linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))",
                    }}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Channels Row */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="text-[11.5px] font-mono uppercase tracking-wider text-[var(--subtle)]">
                  Share via Socials
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {socialLinks.map((s) => (
                    <a
                      key={s.name}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`h-10 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${s.color}`}
                      style={{
                        background: "var(--input)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      {s.icon}
                      <span className="text-[10px] truncate max-w-[65px]">{s.name}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Native Share button if supported */}
              {hasNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full h-10 rounded-xl border flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:bg-white/5 active:scale-[0.99] cursor-pointer"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <Share2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span>More sharing options (System Share)</span>
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

