"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  QrCode,
  ShieldAlert,
  Ticket,
  Users,
  X,
} from "lucide-react";

export interface WelcomeAttendeeInfo {
  name: string;
  ticketCode?: string;
  teamName?: string | null;
  checkedInAt?: string;
  viaScanner?: boolean;
}

export interface AlreadyCheckedInInfo {
  message: string;
  name?: string;
  time?: string;
}

interface CheckInFeedbackModalsProps {
  welcomeAttendee: WelcomeAttendeeInfo | null;
  alreadyCheckedInModal: AlreadyCheckedInInfo | null;
  eventTitle?: string;
  eventMode?: string;
  isDark: boolean;
  onScanNext: () => void;
  onClose: () => void;
}

function formatCheckInTime(isoOrText?: string): string {
  if (!isoOrText) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const parsed = new Date(isoOrText);
  if (Number.isNaN(parsed.getTime())) return isoOrText;
  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CheckInFeedbackModals({
  welcomeAttendee,
  alreadyCheckedInModal,
  eventTitle,
  eventMode,
  isDark,
  onScanNext,
  onClose,
}: CheckInFeedbackModalsProps) {
  const backdropClass = isDark
    ? "bg-black/75 backdrop-blur-xl"
    : "bg-slate-950/35 backdrop-blur-xl";

  return (
    <>
      {/* WELCOME CHECK-IN PASS MODAL */}
      <AnimatePresence>
        {welcomeAttendee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${backdropClass}`}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 16, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-[28px] border overflow-hidden"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--text)",
                boxShadow: isDark
                  ? "0 32px 80px -20px color-mix(in oklab, var(--accent) 34%, rgba(0,0,0,0.88))"
                  : "0 24px 64px -16px color-mix(in oklab, var(--accent) 24%, rgba(15,23,42,0.18))",
              }}
            >
              {/* Top accent bar */}
              <div
                className="h-1.5 w-full"
                style={{
                  background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                }}
              />

              {/* Subtle accent aura */}
              <div
                className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full pointer-events-none blur-3xl opacity-70"
                style={{
                  background:
                    "radial-gradient(circle, color-mix(in oklab, var(--accent) 26%, transparent), transparent 72%)",
                }}
              />

              <div className="relative p-6 sm:p-7 space-y-5">
                {/* Top bar: status chip + close */}
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono font-bold uppercase tracking-wider"
                    style={{
                      background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                      borderColor: "color-mix(in oklab, var(--accent) 32%, transparent)",
                      color: "var(--accent)",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "var(--accent)" }}
                    />
                    Check-In Verified
                  </span>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close welcome message"
                    className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer"
                    style={{
                      background: "var(--card2)",
                      borderColor: "var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Verified icon + welcome headline */}
                <div className="flex flex-col items-center text-center pt-1">
                  <motion.div
                    initial={{ scale: 0.75, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 16, stiffness: 260, delay: 0.05 }}
                    className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-4"
                    style={{
                      background:
                        "linear-gradient(135deg, color-mix(in oklab, var(--accent) 18%, var(--card2)), color-mix(in oklab, var(--accent2) 14%, var(--card2)))",
                      borderColor: "color-mix(in oklab, var(--accent) 36%, transparent)",
                      color: "var(--accent)",
                      boxShadow:
                        "0 12px 30px -10px color-mix(in oklab, var(--accent) 45%, transparent)",
                    }}
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </motion.div>

                  {eventTitle && (
                    <p
                      className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-1.5 line-clamp-1"
                      style={{ color: "var(--subtle)" }}
                    >
                      {eventTitle}
                    </p>
                  )}

                  <h2 className="font-bricolage text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                    Welcome,{" "}
                    <span
                      style={{
                        background:
                          "linear-gradient(135deg, var(--accent), var(--accent2))",
                        WebkitBackgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      {welcomeAttendee.name}
                    </span>
                  </h2>

                  <p
                    className="text-xs sm:text-sm font-medium mt-2 max-w-xs leading-relaxed"
                    style={{ color: "var(--muted)" }}
                  >
                    Pass verified at check-in desk. You&apos;re all set to enter and participate.
                  </p>
                </div>

                {/* Digital Pass Metadata Stub */}
                <div
                  className="rounded-2xl border p-3.5 grid grid-cols-3 gap-2 text-left relative"
                  style={{
                    background: "var(--card2)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="min-w-0">
                    <div
                      className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider"
                      style={{ color: "var(--subtle)" }}
                    >
                      <Ticket className="w-3 h-3 shrink-0" style={{ color: "var(--accent)" }} />
                      <span>Pass</span>
                    </div>
                    <p className="font-mono text-xs font-bold mt-1 truncate">
                      {welcomeAttendee.ticketCode || "CONFIRMED"}
                    </p>
                  </div>

                  <div className="min-w-0 border-l pl-2.5" style={{ borderColor: "var(--border)" }}>
                    <div
                      className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider"
                      style={{ color: "var(--subtle)" }}
                    >
                      <Users className="w-3 h-3 shrink-0" style={{ color: "var(--accent)" }} />
                      <span>{welcomeAttendee.teamName ? "Team" : "Access"}</span>
                    </div>
                    <p className="text-xs font-bold mt-1 truncate capitalize">
                      {welcomeAttendee.teamName || eventMode || "Entry Pass"}
                    </p>
                  </div>

                  <div className="min-w-0 border-l pl-2.5" style={{ borderColor: "var(--border)" }}>
                    <div
                      className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider"
                      style={{ color: "var(--subtle)" }}
                    >
                      <Clock className="w-3 h-3 shrink-0" style={{ color: "var(--accent)" }} />
                      <span>Time</span>
                    </div>
                    <p className="font-mono text-xs font-bold mt-1 truncate">
                      {formatCheckInTime(welcomeAttendee.checkedInAt)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onScanNext}
                    className="flex-1 h-11 rounded-2xl text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--accent), var(--accent2))",
                      boxShadow:
                        "0 10px 24px -8px color-mix(in oklab, var(--accent) 55%, transparent)",
                    }}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan Next Ticket</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="h-11 px-4 rounded-2xl border font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                    style={{
                      background: "var(--card2)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Autoclose progress bar */}
              <div
                className="h-1 w-full overflow-hidden"
                style={{ background: "var(--card2)" }}
              >
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4, ease: "linear" }}
                  className="h-full"
                  style={{
                    background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ALREADY CHECKED IN WARNING MODAL */}
      <AnimatePresence>
        {alreadyCheckedInModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${backdropClass}`}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 16, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-[28px] border overflow-hidden"
              style={{
                background: "var(--card)",
                borderColor: isDark
                  ? "rgba(245, 158, 11, 0.36)"
                  : "rgba(217, 119, 6, 0.35)",
                color: "var(--text)",
                boxShadow: isDark
                  ? "0 30px 80px -20px rgba(245, 158, 11, 0.25)"
                  : "0 24px 60px -16px rgba(217, 119, 6, 0.18)",
              }}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500" />

              <div
                className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full pointer-events-none blur-3xl opacity-60"
                style={{
                  background:
                    "radial-gradient(circle, rgba(245, 158, 11, 0.22), transparent 72%)",
                }}
              />

              <div className="relative p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono font-bold uppercase tracking-wider"
                    style={{
                      background: isDark
                        ? "rgba(245, 158, 11, 0.14)"
                        : "rgba(245, 158, 11, 0.12)",
                      borderColor: isDark
                        ? "rgba(245, 158, 11, 0.32)"
                        : "rgba(217, 119, 6, 0.32)",
                      color: isDark ? "#fbbf24" : "#b45309",
                    }}
                  >
                    Already Checked In
                  </span>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close duplicate check-in alert"
                    className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer"
                    style={{
                      background: "var(--card2)",
                      borderColor: "var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center pt-1">
                  <div
                    className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-4"
                    style={{
                      background: isDark
                        ? "rgba(245, 158, 11, 0.12)"
                        : "rgba(245, 158, 11, 0.1)",
                      borderColor: isDark
                        ? "rgba(245, 158, 11, 0.35)"
                        : "rgba(217, 119, 6, 0.3)",
                      color: isDark ? "#fbbf24" : "#d97706",
                    }}
                  >
                    <ShieldAlert className="w-8 h-8" />
                  </div>

                  <h2 className="font-bricolage text-2xl font-extrabold tracking-tight">
                    Ticket Already Verified
                  </h2>

                  <div
                    className="w-full rounded-2xl border px-4 py-3 mt-3 text-xs sm:text-sm font-semibold leading-relaxed"
                    style={{
                      background: "var(--card2)",
                      borderColor: isDark
                        ? "rgba(245, 158, 11, 0.25)"
                        : "rgba(217, 119, 6, 0.22)",
                      color: isDark ? "#fde68a" : "#92400e",
                    }}
                  >
                    {alreadyCheckedInModal.message}
                  </div>

                  <p
                    className="text-xs font-medium mt-2.5"
                    style={{ color: "var(--muted)" }}
                  >
                    This QR pass was already redeemed and cannot be scanned twice.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onScanNext}
                    className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan Next Ticket</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="h-11 px-4 rounded-2xl border font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                    style={{
                      background: "var(--card2)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div
                className="h-1 w-full overflow-hidden"
                style={{ background: "var(--card2)" }}
              >
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4.5, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

