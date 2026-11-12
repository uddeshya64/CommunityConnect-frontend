"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export type DateTimePickerMode = "datetime" | "date" | "time";

export interface DateTimePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  mode?: DateTimePickerMode;
  placeholder?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  align?: "left" | "right";
  clearable?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function DateTimePicker({
  value,
  onChange,
  mode = "datetime",
  placeholder,
  minDate,
  maxDate,
  disabled = false,
  error = false,
  className = "",
  align = "left",
  clearable = true,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewStep, setViewStep] = useState<"calendar" | "time">("calendar");
  const [activeUnit, setActiveUnit] = useState<"hour" | "minute">("hour");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLDivElement | null>(null);

  // Parse incoming value
  const parsed = useMemo(() => {
    if (!value || typeof value !== "string" || !value.trim()) {
      return { date: null, hour12: 10, minute: 0, isPM: false };
    }

    const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) {
      return { date: null, hour12: 10, minute: 0, isPM: false };
    }

    const h24 = d.getHours();
    const isPM = h24 >= 12;
    const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const minute = d.getMinutes();
    return { date: d, hour12, minute, isPM };
  }, [value]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(parsed.date);
  const [hour, setHour] = useState<number>(parsed.hour12);
  const [minute, setMinute] = useState<number>(parsed.minute);
  const [isPM, setIsPM] = useState<boolean>(parsed.isPM);

  // Month navigation view
  const [viewDate, setViewDate] = useState<Date>(() => parsed.date || new Date());

  // Sync internal state when value prop changes externally
  useEffect(() => {
    if (parsed.date) {
      setSelectedDate(parsed.date);
      setHour(parsed.hour12);
      setMinute(parsed.minute);
      setIsPM(parsed.isPM);
      setViewDate(new Date(parsed.date.getFullYear(), parsed.date.getMonth(), 1));
    } else {
      setSelectedDate(null);
    }
  }, [parsed]);

  // Reset to calendar view whenever opening
  useEffect(() => {
    if (isOpen) {
      setViewStep(mode === "time" ? "time" : "calendar");
      setActiveUnit("hour");
    }
  }, [isOpen, mode]);

  // Click outside and escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Emission helper
  const emitChange = useCallback((d: Date | null, h: number, m: number, pm: boolean) => {
    if (!d) {
      onChange("");
      return;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    if (mode === "date") {
      onChange(`${year}-${month}-${day}`);
      return;
    }

    let h24 = h % 12;
    if (pm) h24 += 12;
    const hours = String(h24).padStart(2, "0");
    const minutes = String(m).padStart(2, "0");

    onChange(`${year}-${month}-${day}T${hours}:${minutes}`);
  }, [mode, onChange]);

  // Step 1: User selects a day on the calendar
  const handleSelectDay = (day: Date) => {
    setSelectedDate(day);

    if (mode === "date") {
      emitChange(day, hour, minute, isPM);
      setIsOpen(false);
      return;
    }

    // Two-step flow: Immediately transition to circular clock time selection!
    emitChange(day, hour, minute, isPM);
    setViewStep("time");
    setActiveUnit("hour");
  };

  // Step 2: Time changes
  const handleHourSelect = (newHour: number) => {
    setHour(newHour);
    const baseDate = selectedDate || new Date();
    setSelectedDate(baseDate);
    emitChange(baseDate, newHour, minute, isPM);

    // Like Google Clock: automatically advance to minute selection!
    setActiveUnit("minute");
  };

  const handleMinuteSelect = (newMinute: number) => {
    setMinute(newMinute);
    const baseDate = selectedDate || new Date();
    setSelectedDate(baseDate);
    emitChange(baseDate, hour, newMinute, isPM);
  };

  const handleToggleAmPm = (pm: boolean) => {
    setIsPM(pm);
    const baseDate = selectedDate || new Date();
    emitChange(baseDate, hour, minute, pm);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange("");
  };

  // Dial touch/mouse calculation
  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    let rad = Math.atan2(dy, dx);
    let deg = (rad * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (activeUnit === "hour") {
      const step = Math.round(deg / 30) % 12;
      const selected = step === 0 ? 12 : step;
      handleHourSelect(selected);
    } else {
      const selectedMin = Math.round(deg / 6) % 60;
      handleMinuteSelect(selectedMin);
    }
  };

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const cells: Array<{ date: Date; isCurrentMonth: boolean; isDisabled: boolean }> = [];

    // Previous month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({ date: d, isCurrentMonth: false, isDisabled: isDateDisabled(d) });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ date: d, isCurrentMonth: true, isDisabled: isDateDisabled(d) });
    }

    // Next month padding to fill rows of 7 (up to 35 or 42)
    const totalCount = cells.length > 35 ? 42 : 35;
    const remaining = totalCount - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      cells.push({ date: d, isCurrentMonth: false, isDisabled: isDateDisabled(d) });
    }

    return cells;
  }, [year, month, firstDayOfWeek, daysInMonth, prevMonthDays, minDate, maxDate]);

  function isDateDisabled(d: Date): boolean {
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      const target = new Date(d);
      target.setHours(0, 0, 0, 0);
      if (target.getTime() < min.getTime()) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      if (d.getTime() > max.getTime()) return true;
    }
    return false;
  }

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (d: Date) => {
    if (!selectedDate) return false;
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Formatted trigger label parts - optimized so both date & time are clearly visible without truncating
  const formattedParts = useMemo(() => {
    if (!selectedDate) return null;

    const monthStr = selectedDate.toLocaleDateString("en-US", { month: "short" });
    const day = selectedDate.getDate();
    const yr = selectedDate.getFullYear();

    const hStr = String(hour);
    const mStr = String(minute).padStart(2, "0");
    const ampm = isPM ? "PM" : "AM";
    const timeStr = `${hStr}:${mStr} ${ampm}`;

    if (mode === "date") {
      return {
        dateStr: `${monthStr} ${day}, ${yr}`,
        timeStr: "",
        fullText: `${monthStr} ${day}, ${yr}`,
      };
    }

    if (mode === "time") {
      return {
        dateStr: "",
        timeStr,
        fullText: timeStr,
      };
    }

    return {
      dateStr: `${monthStr} ${day}, ${yr}`,
      timeStr,
      fullText: `${monthStr} ${day}, ${yr} • ${timeStr}`,
    };
  }, [selectedDate, hour, minute, isPM, mode]);

  const formattedDisplay = formattedParts?.fullText || null;

  const defaultPlaceholder = mode === "date" ? "Select date..." : "Select date & time...";

  // Clock Hand Angle calculation
  const handAngle = activeUnit === "hour" ? (hour % 12) * 30 : minute * 6;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* TRIGGER INPUT BUTTON */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={formattedDisplay || placeholder || defaultPlaceholder}
        className={`w-full h-11 px-3 rounded-xl border flex items-center justify-between text-left text-xs transition-all cursor-pointer outline-none select-none ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[color-mix(in_oklab,var(--accent)_60%,var(--border))]"
        }`}
        style={{
          background: "var(--input)",
          borderColor: error ? "#ef4444" : isOpen ? "var(--accent)" : "var(--border)",
          color: "var(--text)",
          boxShadow: isOpen ? "0 0 0 3px color-mix(in oklab, var(--accent) 20%, transparent)" : undefined,
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: formattedDisplay
                ? "color-mix(in oklab, var(--accent) 15%, transparent)"
                : "color-mix(in oklab, var(--muted) 12%, transparent)",
              color: formattedDisplay ? "var(--accent)" : "var(--muted)",
            }}
          >
            {mode === "date" ? <CalendarIcon className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          </div>

          {formattedParts ? (
            <div className="flex items-center gap-1.5 min-w-0 text-xs font-semibold overflow-hidden">
              <span className="truncate" style={{ color: "var(--text)" }}>
                {formattedParts.dateStr}
              </span>
              {formattedParts.timeStr && (
                <>
                  <span className="shrink-0 opacity-40 text-xs" style={{ color: "var(--muted)" }}>•</span>
                  <span
                    className="shrink-0 font-bold px-1.5 py-0.5 rounded-md text-[11px]"
                    style={{
                      background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                      color: "var(--accent)",
                    }}
                  >
                    {formattedParts.timeStr}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span
              className="truncate font-normal text-xs"
              style={{ color: "var(--muted)" }}
            >
              {placeholder || defaultPlaceholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1.5">
          {clearable && formattedDisplay && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 rounded-md transition hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: "var(--muted)" }}
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <CalendarIcon
            className="w-3.5 h-3.5 transition-transform duration-200"
            style={{
              color: isOpen ? "var(--accent)" : "var(--muted)",
              transform: isOpen ? "rotate(15deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </button>

      {/* COMPACT & MODERN TWO-STEP POPOVER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-2 z-50 w-[290px] p-3.5 rounded-3xl border shadow-2xl backdrop-blur-xl flex flex-col`}
            style={{
              background: "color-mix(in oklab, var(--card) 97%, var(--bg))",
              borderColor: "var(--border)",
              boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.45)",
            }}
          >
            {/* ================= STEP 1: ONLY CALENDAR ================= */}
            {viewStep === "calendar" && (
              <div className="flex flex-col gap-2.5">
                {/* Month navigation header */}
                <div className="flex items-center justify-between px-0.5">
                  <button
                    type="button"
                    onClick={() => setViewDate(new Date(year, month - 1, 1))}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1 font-black text-xs sm:text-sm tracking-tight" style={{ color: "var(--text)" }}>
                    <span>{MONTH_NAMES[month]}</span>
                    <span style={{ color: "var(--muted)" }}>{year}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewDate(new Date(year, month + 1, 1))}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer"
                    style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                    title="Next month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Weekday labels */}
                <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-extrabold uppercase" style={{ color: "var(--muted)" }}>
                  {WEEKDAY_NAMES.map((name) => (
                    <div key={name} className="py-0.5">
                      {name}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, idx) => {
                    const daySelected = isSelected(cell.date);
                    const dayToday = isToday(cell.date);

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={cell.isDisabled}
                        onClick={() => handleSelectDay(cell.date)}
                        className={`h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer relative select-none ${
                          cell.isDisabled ? "opacity-20 cursor-not-allowed" : "hover:scale-105 active:scale-95"
                        }`}
                        style={
                          daySelected
                            ? {
                                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                                color: "#fff",
                                boxShadow: "0 2px 8px color-mix(in oklab, var(--accent) 40%, transparent)",
                              }
                            : dayToday
                            ? {
                                background: "color-mix(in oklab, var(--accent) 15%, var(--card2))",
                                border: "1px solid color-mix(in oklab, var(--accent) 40%, transparent)",
                                color: "var(--accent)",
                              }
                            : cell.isCurrentMonth
                            ? {
                                background: "transparent",
                                color: "var(--text)",
                              }
                            : {
                                background: "transparent",
                                color: "var(--subtle)",
                                opacity: 0.35,
                              }
                        }
                      >
                        <span>{cell.date.getDate()}</span>
                        {dayToday && !daySelected && (
                          <span
                            className="absolute bottom-0.5 w-1 h-1 rounded-full"
                            style={{ background: "var(--accent)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer with jump to time (if already chosen date) */}
                <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: "var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      handleSelectDay(today);
                    }}
                    className="text-[11px] font-bold hover:underline cursor-pointer"
                    style={{ color: "var(--muted)" }}
                  >
                    Today
                  </button>

                  {mode === "datetime" && selectedDate && (
                    <button
                      type="button"
                      onClick={() => setViewStep("time")}
                      className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-lg border transition hover:opacity-80 cursor-pointer"
                      style={{
                        background: "color-mix(in oklab, var(--accent) 10%, var(--card2))",
                        borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      <span>Time: {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")} {isPM ? "PM" : "AM"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ================= STEP 2: CIRCULAR GOOGLE-STYLE CLOCK ================= */}
            {viewStep === "time" && (
              <div className="flex flex-col gap-2.5">
                {/* Back to calendar button & selected date pill */}
                <div className="flex items-center justify-between border-b pb-2 px-0.5" style={{ borderColor: "var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setViewStep("calendar")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold transition hover:opacity-80 cursor-pointer"
                    style={{ color: "var(--muted)" }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{selectedDate ? selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Calendar"}</span>
                  </button>

                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                    Select {activeUnit === "hour" ? "Hour" : "Minute"}
                  </span>
                </div>

                {/* Digital Time Display (Click to switch between Hour & Minute) */}
                <div className="flex items-center justify-center gap-2 py-1">
                  <div className="flex items-center gap-1">
                    {/* Hour box */}
                    <button
                      type="button"
                      onClick={() => setActiveUnit("hour")}
                      className={`w-11 h-9 rounded-xl border flex items-center justify-center font-mono font-black text-lg transition-all cursor-pointer ${
                        activeUnit === "hour" ? "shadow-sm scale-105" : "opacity-60 hover:opacity-100"
                      }`}
                      style={{
                        background: activeUnit === "hour" ? "color-mix(in oklab, var(--accent) 15%, var(--card2))" : "var(--card2)",
                        borderColor: activeUnit === "hour" ? "var(--accent)" : "var(--border)",
                        color: activeUnit === "hour" ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      {String(hour).padStart(2, "0")}
                    </button>

                    <span className="font-mono font-black text-base" style={{ color: "var(--muted)" }}>:</span>

                    {/* Minute box */}
                    <button
                      type="button"
                      onClick={() => setActiveUnit("minute")}
                      className={`w-11 h-9 rounded-xl border flex items-center justify-center font-mono font-black text-lg transition-all cursor-pointer ${
                        activeUnit === "minute" ? "shadow-sm scale-105" : "opacity-60 hover:opacity-100"
                      }`}
                      style={{
                        background: activeUnit === "minute" ? "color-mix(in oklab, var(--accent) 15%, var(--card2))" : "var(--card2)",
                        borderColor: activeUnit === "minute" ? "var(--accent)" : "var(--border)",
                        color: activeUnit === "minute" ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      {String(minute).padStart(2, "0")}
                    </button>
                  </div>

                  {/* AM / PM Segmented Switch */}
                  <div className="p-0.5 rounded-xl border flex items-center ml-2" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleAmPm(false)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        !isPM ? "shadow-xs" : "opacity-50 hover:opacity-90"
                      }`}
                      style={{
                        background: !isPM ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "transparent",
                        color: !isPM ? "#fff" : "var(--text)",
                      }}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAmPm(true)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                        isPM ? "shadow-xs" : "opacity-50 hover:opacity-90"
                      }`}
                      style={{
                        background: isPM ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "transparent",
                        color: isPM ? "#fff" : "var(--text)",
                      }}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* CIRCULAR CLOCK FACE (MATERIAL / GOOGLE STYLE) */}
                <div className="flex items-center justify-center py-1">
                  <div
                    ref={clockRef}
                    onClick={handleDialClick}
                    className="relative w-[196px] h-[196px] rounded-full border shadow-inner flex items-center justify-center cursor-pointer select-none transition-colors"
                    style={{
                      background: "color-mix(in oklab, var(--card2) 75%, var(--bg))",
                      borderColor: "var(--border)",
                    }}
                  >
                    {/* Center Pivot Point */}
                    <div
                      className="absolute w-2 h-2 rounded-full z-20 pointer-events-none"
                      style={{ background: "var(--accent)" }}
                    />

                    {/* Clock Hand pointing to selected angle */}
                    <div
                      className="absolute top-1/2 left-1/2 w-0.5 h-[68px] origin-top z-10 pointer-events-none transition-transform duration-200"
                      style={{
                        transform: `translate(-50%, 0) rotate(${handAngle + 180}deg)`,
                        background: "var(--accent)",
                      }}
                    >
                      {/* Round Selector Bubble at hand tip */}
                      <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-7 h-7 rounded-full shadow-md flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                          boxShadow: "0 2px 8px color-mix(in oklab, var(--accent) 45%, transparent)",
                        }}
                      />
                    </div>

                    {/* Clock Numbers (Hours: 1-12, Minutes: 00-55) */}
                    {(activeUnit === "hour" ? HOURS_12 : MINUTES_5).map((num, i) => {
                      const angleDeg = i * 30; // 0 deg is 12 (or 00)
                      const rad = (angleDeg - 90) * (Math.PI / 180);
                      const radius = 68; // distance from center
                      const x = Math.round(98 + radius * Math.cos(rad));
                      const y = Math.round(98 + radius * Math.sin(rad));

                      const isSelectedNumber = activeUnit === "hour" ? hour === num : minute === num;

                      return (
                        <div
                          key={num}
                          className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[11px] font-mono font-bold z-15 pointer-events-none transition-colors"
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                            color: isSelectedNumber ? "#fff" : "var(--text)",
                          }}
                        >
                          {activeUnit === "minute" ? String(num).padStart(2, "0") : num}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer with Set to Now & Done */}
                <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const h24 = now.getHours();
                      const nowIsPM = h24 >= 12;
                      const nowH12 = h24 % 12 === 0 ? 12 : h24 % 12;
                      const nowMin = Math.round(now.getMinutes() / 5) * 5 % 60;
                      setSelectedDate(now);
                      setHour(nowH12);
                      setMinute(nowMin);
                      setIsPM(nowIsPM);
                      emitChange(now, nowH12, nowMin, nowIsPM);
                    }}
                    className="text-[11px] font-bold hover:underline cursor-pointer"
                    style={{ color: "var(--muted)" }}
                  >
                    Now
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 rounded-xl font-bold text-xs text-white shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Done
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
