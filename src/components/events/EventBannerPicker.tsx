"use client";

import React, { useState } from "react";
import { UploadCloud, Link2, ImageIcon, X, Sparkles } from "lucide-react";
import { getEventBannerInfo, CUSTOM_TEMPLATE_ID } from "@/lib/eventTemplates";

export interface EventBannerPickerProps {
  bannerUrl: string;
  bannerFile: File | null;
  filePreviewUrl?: string;
  templateId?: string | null;
  onFileSelect: (file: File) => void;
  onUrlChange: (url: string) => void;
  onClear: () => void;
  error?: string;
  compact?: boolean;
}

const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const VALID_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Shared banner uploader + image URL input with live cover preview and
 * automatic template-theme cover fallback when left blank.
 */
export default function EventBannerPicker({
  bannerUrl,
  bannerFile,
  filePreviewUrl = "",
  templateId,
  onFileSelect,
  onUrlChange,
  onClear,
  error,
  compact = false,
}: EventBannerPickerProps) {
  const [mode, setMode] = useState<"upload" | "url">(
    !bannerFile && bannerUrl.trim() ? "url" : "upload"
  );
  const [localError, setLocalError] = useState("");
  const [imgBroken, setImgBroken] = useState(false);

  const trimmedUrl = bannerUrl.trim();
  const hasValidUrl = isValidHttpUrl(trimmedUrl);

  const resolvedCustom = bannerFile && filePreviewUrl
    ? filePreviewUrl
    : hasValidUrl
    ? trimmedUrl
    : "";

  const fallbackInfo = getEventBannerInfo("", templateId);
  const effectivePreview = !imgBroken && resolvedCustom ? resolvedCustom : fallbackInfo.url;
  const sourceLabel =
    bannerFile && filePreviewUrl
      ? "Uploaded File"
      : hasValidUrl && !imgBroken
      ? "Custom Image URL"
      : fallbackInfo.templateLabel === CUSTOM_TEMPLATE_ID
      ? "Default Cover"
      : `${fallbackInfo.templateLabel} Cover`;

  const isCustomActive = Boolean(bannerFile || trimmedUrl);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALID_MIME_TYPES.has(file.type)) {
      setLocalError("Please choose a PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
      setLocalError("Banner image must be 5MB or smaller.");
      return;
    }
    setLocalError("");
    setImgBroken(false);
    onFileSelect(file);
  };

  const displayError = localError || error;

  return (
    <div className="space-y-3 w-full">
      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex p-1 rounded-xl border gap-1"
          style={{ background: "var(--input)", borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={() => setMode("upload")}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            style={
              mode === "upload"
                ? {
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    color: "#fff",
                  }
                : { color: "var(--muted)" }
            }
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            style={
              mode === "url"
                ? {
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    color: "#fff",
                  }
                : { color: "var(--muted)" }
            }
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>
        </div>

        {isCustomActive && (
          <button
            type="button"
            onClick={() => {
              setLocalError("");
              setImgBroken(false);
              onClear();
            }}
            className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Use Template Cover</span>
          </button>
        )}
      </div>

      {/* Input Area */}
      {mode === "upload" ? (
        <div className="space-y-2.5">
          <label
            className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all hover:border-[var(--accent)] ${
              compact ? "h-24" : "h-28"
            }`}
            style={{ background: "var(--card2)", borderColor: "var(--border)" }}
          >
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div
                className="p-2 rounded-xl mb-1.5"
                style={{ background: "var(--input)", color: "var(--accent)" }}
              >
                <UploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-bold" style={{ color: "var(--text)" }}>
                {bannerFile ? "Swap banner image" : "Click to upload event cover banner"}
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--subtle)" }}>
                PNG, JPG, or WEBP · Max 5MB
              </p>
            </div>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>

          {bannerFile && (
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
              style={{ background: "var(--card2)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="p-1.5 rounded-lg shrink-0"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                    {bannerFile.name}
                  </p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>
                    {(bannerFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocalError("");
                  setImgBroken(false);
                  onClear();
                }}
                className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="relative">
            <Link2
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--muted)" }}
            />
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => {
                setLocalError("");
                setImgBroken(false);
                onUrlChange(e.target.value);
              }}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full h-11 pl-10 pr-9 rounded-xl border text-xs sm:text-sm font-semibold outline-none transition"
              style={{
                background: "var(--input)",
                borderColor: displayError ? "#ef4444" : "var(--border)",
                color: "var(--text)",
              }}
            />
            {bannerUrl.trim() && (
              <button
                type="button"
                onClick={() => {
                  setLocalError("");
                  setImgBroken(false);
                  onClear();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:opacity-80 cursor-pointer"
                style={{ color: "var(--muted)" }}
                title="Clear image URL"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {trimmedUrl && !hasValidUrl && (
            <p className="text-[11px] font-semibold text-amber-500">
              Enter a full image URL starting with https:// or http:// (or leave blank to use the template cover).
            </p>
          )}
        </div>
      )}

      {displayError && (
        <p className="text-xs font-bold text-red-500">{displayError}</p>
      )}

      {/* Live Preview with Template Fallback */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border group ${
          compact ? "h-36 sm:h-40" : "h-44 sm:h-48"
        }`}
        style={{ background: "var(--card2)", borderColor: "var(--border)" }}
      >
        <img
          src={effectivePreview}
          alt="Event Banner Preview"
          onError={() => {
            if (resolvedCustom) setImgBroken(true);
          }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20"
            style={{ background: "rgba(15, 23, 42, 0.65)" }}
          >
            <Sparkles className="w-3 h-3" style={{ color: "var(--accent)" }} />
            <span>{sourceLabel}</span>
          </span>
          {!isCustomActive && (
            <span className="text-[11px] font-medium text-white/85 drop-shadow-xs">
              Auto-used unless you upload or link a banner
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

