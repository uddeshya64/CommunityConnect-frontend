"use client";

import React from "react";
import { formatEventFee, isFreeFee } from "@/lib/feeUtils";

export type FeeBadgeSize = "xs" | "sm" | "md" | "lg";

export interface EventFeeBadgeProps {
  fee: unknown;
  size?: FeeBadgeSize;
  className?: string;
  paidClassName?: string;
}

const FREE_SIZE_CLASSES: Record<FeeBadgeSize, string> = {
  xs: "px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
  sm: "px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider",
  md: "px-3 py-1 text-xs font-black uppercase tracking-wider",
  lg: "px-5 py-1.5 text-2xl sm:text-3xl font-black uppercase tracking-wider",
};

const PAID_SIZE_CLASSES: Record<FeeBadgeSize, string> = {
  xs: "text-xs font-bold",
  sm: "text-xs font-bold",
  md: "text-sm font-bold",
  lg: "font-bricolage text-3xl sm:text-4xl font-black tracking-tight",
};

/**
 * Renders event pricing consistently: when fee is empty or 0, displays "Free"
 * in a highlighted neon pill; otherwise renders the formatted INR amount.
 */
export default function EventFeeBadge({
  fee,
  size = "sm",
  className = "",
  paidClassName,
}: EventFeeBadgeProps) {
  if (isFreeFee(fee)) {
    const isLarge = size === "lg";
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full border select-none ${FREE_SIZE_CLASSES[size]} ${className}`}
        style={{
          color: "var(--accent)",
          borderColor: "color-mix(in oklab, var(--accent) 65%, transparent)",
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--accent) 16%, transparent), color-mix(in oklab, var(--accent2) 10%, transparent))",
          boxShadow: isLarge
            ? "0 0 24px color-mix(in oklab, var(--accent) 42%, transparent), 0 0 8px color-mix(in oklab, var(--accent2) 32%, transparent), inset 0 0 12px color-mix(in oklab, var(--accent) 15%, transparent)"
            : "0 0 14px color-mix(in oklab, var(--accent) 32%, transparent), inset 0 0 8px color-mix(in oklab, var(--accent) 12%, transparent)",
          textShadow: "0 0 10px color-mix(in oklab, var(--accent) 38%, transparent)",
        }}
      >
        Free
      </span>
    );
  }

  return (
    <span className={`${paidClassName ?? PAID_SIZE_CLASSES[size]} ${className}`}>
      {formatEventFee(fee)}
    </span>
  );
}

