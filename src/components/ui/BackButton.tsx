"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export interface BackButtonProps {
  /**
   * Optional explicit destination URL.
   * If provided, always navigates to this URL.
   * If omitted, smartly calls router.back() when history is present,
   * falling back to fallbackHref.
   */
  href?: string;

  /**
   * Fallback URL if browser history has nowhere to go back to (e.g., opened via direct URL).
   * Defaults to "/home".
   */
  fallbackHref?: string;

  /**
   * Button label text. Defaults to "Back".
   */
  label?: string;

  /**
   * Additional custom CSS classes.
   */
  className?: string;

  /**
   * Visual variant:
   * - "default": themed card button with border and subtle hover scale
   * - "ghost": transparent background with subtle text hover
   * - "subtle": soft pill background
   */
  variant?: "default" | "ghost" | "subtle";

  /**
   * Optional click handler called before navigation.
   */
  onClick?: () => void;
}

export default function BackButton({
  href,
  fallbackHref = "/home",
  label = "Back",
  className = "",
  variant = "default",
  onClick,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (onClick) {
      onClick();
    }

    if (href) {
      router.push(href);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer select-none ${className}`}
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200 text-current" />
        <span className="group-hover:text-[var(--text)] transition-colors">{label}</span>
      </button>
    );
  }

  if (variant === "subtle") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer select-none ${className}`}
        style={{
          background: "var(--card2)",
          color: "var(--text)",
        }}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200 shrink-0 text-[var(--muted)] group-hover:text-[var(--text)]" />
        <span>{label}</span>
      </button>
    );
  }

  // Default: sleek themed border pill matching Eventrix design tokens
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:border-[var(--accent)]/40 shadow-2xs select-none cursor-pointer ${className}`}
      style={{
        background: "var(--input)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
      title={label}
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200 shrink-0 text-[var(--muted)] group-hover:text-[var(--text)]" />
      <span>{label}</span>
    </button>
  );
}

