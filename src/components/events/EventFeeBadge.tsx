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
        className={`inline-flex items-center justify-center rounded-full border border-emerald-500/70 dark:border-emerald-400/80 text-emerald-700 dark:text-emerald-300 select-none ${FREE_SIZE_CLASSES[size]} ${className}`}
        style={{
          background:
            "linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(52, 211, 153, 0.1))",
          boxShadow: isLarge
            ? "0 0 24px rgba(16, 185, 129, 0.45), 0 0 8px rgba(52, 211, 153, 0.35), inset 0 0 12px rgba(16, 185, 129, 0.16)"
            : "0 0 14px rgba(16, 185, 129, 0.36), inset 0 0 8px rgba(16, 185, 129, 0.14)",
          textShadow: "0 0 10px rgba(16, 185, 129, 0.4)",
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

