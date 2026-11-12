"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  Clock,
  FolderOpen,
  MapPin,
  PenLine,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useToast } from "@/components/providers/ToastProvider";
import EventFeeBadge from "@/components/events/EventFeeBadge";
import {
  clearAllEventDrafts,
  DEFAULT_FALLBACK_COVER,
  deleteEventDraft,
  formatRelativeDraftTime,
  listEventDrafts,
  removeNotificationsForDraft,
  saveAiDraft,
  saveManualDraft,
  type SavedEventDraft,
} from "@/lib/eventDraftStorage";

interface DraftsFolderSectionProps {
  initialOpen?: boolean;
  highlightDraftId?: string | null;
}

type SourceFilter = "all" | "manual" | "ai";

const emptySubscribe = () => () => {};

export default function DraftsFolderSection({
  initialOpen = false,
  highlightDraftId = null,
}: DraftsFolderSectionProps) {
  const router = useRouter();
  const { isDark } = useAppearance();
  const { success: showSuccess, info: showInfo } = useToast();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [drafts, setDrafts] = useState<SavedEventDraft[]>([]);
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState<SavedEventDraft | null>(null);

  const refreshDrafts = () => {
    setDrafts(listEventDrafts());
  };

  useEffect(() => {
    const tInit = window.setTimeout(() => refreshDrafts(), 0);

    const handleRefresh = () => refreshDrafts();
    window.addEventListener("cc_drafts_updated", handleRefresh);
    window.addEventListener("cc_auth_changed", handleRefresh);
    window.addEventListener("storage", handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.clearTimeout(tInit);
      window.removeEventListener("cc_drafts_updated", handleRefresh);
      window.removeEventListener("cc_auth_changed", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (!initialOpen) return;
    const tOpen = window.setTimeout(() => {
      setIsOpen(true);
      refreshDrafts();
    }, 0);
    return () => window.clearTimeout(tOpen);
  }, [initialOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setConfirmClearAll(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const counts = useMemo(() => {
    const manual = drafts.filter((d) => d.source === "manual").length;
    const ai = drafts.filter((d) => d.source === "ai").length;
    return { all: drafts.length, manual, ai };
  }, [drafts]);

  const filteredDrafts = useMemo(() => {
    if (filter === "all") return drafts;
    return drafts.filter((d) => d.source === filter);
  }, [drafts, filter]);

  const collageSlots = useMemo(() => {
    return [0, 1, 2, 3].map((idx) => drafts[idx] || null);
  }, [drafts]);

  const handleClose = () => {
    setIsOpen(false);
    setConfirmClearAll(false);
    if (typeof window !== "undefined" && window.location.search.includes("folder=")) {
      router.replace("/events/create", { scroll: false });
    }
  };

  const handleResumeDraft = (draft: SavedEventDraft) => {
    setIsOpen(false);
    if (draft.source === "ai") {
      router.push(`/events/create/ai?draft=${encodeURIComponent(draft.id)}`);
    } else {
      router.push(`/events/create/new?draft=${encodeURIComponent(draft.id)}`);
    }
  };

  const handleDeleteDraft = (draft: SavedEventDraft, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteEventDraft(draft.id);
    removeNotificationsForDraft(draft.id);
    setRecentlyDeleted(draft);
    refreshDrafts();
    showInfo(`Deleted draft "${draft.title}"`);
  };

  const handleUndoDelete = () => {
    if (!recentlyDeleted) return;
    if (recentlyDeleted.source === "ai" && recentlyDeleted.aiState) {
      saveAiDraft(
        recentlyDeleted.id,
        recentlyDeleted.aiState,
        recentlyDeleted.lastReason || "autosave"
      );
    } else if (recentlyDeleted.source === "manual" && recentlyDeleted.manualState) {
      saveManualDraft(
        recentlyDeleted.id,
        recentlyDeleted.manualState,
        recentlyDeleted.lastReason || "autosave"
      );
    }
    setRecentlyDeleted(null);
    refreshDrafts();
    showSuccess("Draft restored to folder!");
  };

  const handleClearAll = () => {
    clearAllEventDrafts();
    setRecentlyDeleted(null);
    setConfirmClearAll(false);
    refreshDrafts();
    showInfo("Cleared all saved drafts");
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[86vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
            style={{
              background: isDark ? "#0d0f15" : "#f8fafc",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            {/* Instagram Saved Collection Top Header Bar */}
            <div
              className="px-4 sm:px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Mini 2x2 Instagram Folder Icon */}
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 gap-[1px] p-[1px] border shrink-0"
                  style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                >
                  {collageSlots.map((slot, i) =>
                    slot ? (
                      <img
                        key={slot.id}
                        src={slot.banner_url || DEFAULT_FALLBACK_COVER}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        key={`mini-${i}`}
                        style={{
                          background: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(15,23,42,0.06)",
                        }}
                      />
                    )
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-base sm:text-lg font-extrabold truncate"
                      style={{ fontFamily: "var(--font-display, inherit)" }}
                    >
                      Saved Drafts
                    </h2>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 16%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {counts.all}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium truncate" style={{ color: "var(--muted)" }}>
                    Saved locally • Works offline • Pick up any draft to edit or delete
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {drafts.length > 0 && !confirmClearAll && (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="h-9 px-3 rounded-xl border text-xs font-bold transition-colors hover:border-red-500/40 hover:text-red-500 cursor-pointer flex items-center gap-1.5"
                    style={{
                      background: "var(--input)",
                      borderColor: "var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear All</span>
                  </button>
                )}

                {confirmClearAll && (
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-xl px-2.5 py-1">
                    <span className="text-[11px] font-bold text-red-500">Delete all drafts?</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2 py-0.5 rounded-lg bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer"
                      style={{ color: "var(--muted)" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs + Undo Bar */}
            <div
              className="px-4 sm:px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0"
              style={{
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: "all", label: `All (${counts.all})` },
                    { id: "manual", label: `Manual Builder (${counts.manual})` },
                    { id: "ai", label: `AI Studio (${counts.ai})` },
                  ] as const
                ).map((tab) => {
                  const active = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border"
                      style={
                        active
                          ? {
                              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                              color: "#ffffff",
                              borderColor: "transparent",
                            }
                          : {
                              background: "var(--input)",
                              color: "var(--muted)",
                              borderColor: "var(--border)",
                            }
                      }
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {recentlyDeleted && (
                <button
                  type="button"
                  onClick={handleUndoDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-[1.02] cursor-pointer"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                    borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo delete &ldquo;{recentlyDeleted.title.slice(0, 22)}&rdquo;
                </button>
              )}
            </div>

            {/* Instagram-style Grid of Saved Drafts */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {filteredDrafts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrafts.map((draft) => {
                    const isHighlighted = highlightDraftId === draft.id;
                    const isAi = draft.source === "ai";
                    return (
                      <motion.div
                        layout
                        key={draft.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleResumeDraft(draft)}
                        className="group rounded-2xl border overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                        style={{
                          background: "var(--card)",
                          borderColor: isHighlighted ? "var(--accent)" : "var(--border)",
                          boxShadow: isHighlighted
                            ? "0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)"
                            : undefined,
                        }}
                      >
                        {/* Instagram Card Cover Image */}
                        <div className="relative h-36 overflow-hidden bg-zinc-900">
                          <img
                            src={draft.banner_url || DEFAULT_FALLBACK_COVER}
                            alt={draft.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/15" />

                          {/* Top Left: Source Pill */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white backdrop-blur-md shadow-xs"
                              style={{
                                background: isAi
                                  ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                                  : "rgba(15, 23, 42, 0.78)",
                              }}
                            >
                              {isAi ? (
                                <Sparkles className="w-3 h-3" />
                              ) : (
                                <SlidersHorizontal className="w-3 h-3" />
                              )}
                              {isAi ? "AI Studio" : "Manual"}
                            </span>

                            {draft.lastReason === "offline" && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/90 text-white backdrop-blur-md">
                                <WifiOff className="w-2.5 h-2.5" />
                                Offline
                              </span>
                            )}
                          </div>

                          {/* Top Right: Delete Button */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDraft(draft, e)}
                              className="w-8 h-8 rounded-full bg-black/55 hover:bg-red-600 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer border border-white/15"
                              title="Delete draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Bottom Image Labels */}
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-white">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-md truncate">
                              {draft.category || "Custom"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/85 shrink-0">
                              <Clock className="w-3 h-3" />
                              {formatRelativeDraftTime(draft.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div className="space-y-1.5">
                            <h3
                              className="text-sm font-extrabold line-clamp-1 leading-snug"
                              style={{ color: "var(--text)" }}
                            >
                              {draft.title}
                            </h3>

                            <p
                              className="text-xs line-clamp-2 leading-relaxed min-h-[2.25rem]"
                              style={{ color: "var(--muted)" }}
                            >
                              {draft.description ||
                                "Draft details saved locally. Resume to complete remaining fields."}
                            </p>

                            {/* Meta Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {draft.completionHint && (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                                  style={{
                                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                                    borderColor: "color-mix(in srgb, var(--accent) 28%, transparent)",
                                    color: "var(--accent)",
                                  }}
                                >
                                  {draft.completionHint}
                                </span>
                              )}
                              {draft.mode && (
                                <span
                                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border"
                                  style={{
                                    background: "var(--input)",
                                    borderColor: "var(--border)",
                                    color: "var(--muted)",
                                  }}
                                >
                                  {draft.mode}
                                </span>
                              )}
                              <EventFeeBadge
                                fee={
                                  draft.manualState?.formData?.registration_fee ??
                                  draft.aiState?.draft?.registration_fee ??
                                  0
                                }
                                size="xs"
                              />
                            </div>

                            {(draft.location || draft.start_date) && (
                              <div
                                className="pt-1 space-y-1 text-[11px] font-medium"
                                style={{ color: "var(--muted)" }}
                              >
                                {draft.start_date && (
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Calendar
                                      className="w-3 h-3 shrink-0"
                                      style={{ color: "var(--accent)" }}
                                    />
                                    <span className="truncate">
                                      {new Date(draft.start_date).toLocaleString([], {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })}
                                    </span>
                                  </div>
                                )}
                                {draft.location && (
                                  <div className="flex items-center gap-1.5 truncate">
                                    <MapPin
                                      className="w-3 h-3 shrink-0"
                                      style={{ color: "var(--accent)" }}
                                    />
                                    <span className="truncate">{draft.location}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions Footer */}
                          <div
                            className="pt-3 border-t flex items-center gap-2"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeDraft(draft);
                              }}
                              className="flex-1 h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                              style={{
                                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                              }}
                            >
                              <PenLine className="w-3.5 h-3.5" />
                              Edit &amp; Resume
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDraft(draft, e)}
                              className="h-9 px-3 rounded-xl border text-xs font-bold transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 cursor-pointer flex items-center gap-1"
                              style={{
                                background: "var(--input)",
                                borderColor: "var(--border)",
                                color: "var(--muted)",
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="py-16 px-4 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                      borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                      color: "var(--accent)",
                    }}
                  >
                    <Bookmark className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-extrabold" style={{ color: "var(--text)" }}>
                    {counts.all === 0
                      ? "Your Saved Drafts folder is empty"
                      : "No drafts in this category"}
                  </h3>
                  <p
                    className="text-xs mt-1.5 max-w-md font-medium leading-relaxed"
                    style={{ color: "var(--muted)" }}
                  >
                    Start building any event in Manual Builder or AI Event Creator. If your
                    connection drops or you switch pages, your progress will be saved right here
                    automatically.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* =====================================================================
          SIMPLE PLAIN DRAFTED EVENTS CARD (Before Template Cards)
         ===================================================================== */}
      <motion.button
        type="button"
        onClick={() => {
          refreshDrafts();
          setIsOpen(true);
        }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="text-left rounded-3xl border flex flex-col justify-between overflow-hidden cursor-pointer shadow-xs hover:shadow-xl transition-all duration-200 group"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          minHeight: "260px",
        }}
      >
        <div
          className="h-32 w-full flex flex-col items-center justify-center p-4"
          style={{ background: "var(--card2)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs transition-transform duration-300 group-hover:scale-110"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--accent)",
            }}
          >
            <FolderOpen className="w-6 h-6" />
          </div>
          {counts.all > 0 && (
            <span
              className="text-[11px] font-mono font-bold mt-2"
              style={{ color: "var(--muted)" }}
            >
              {counts.all} {counts.all === 1 ? "draft" : "drafts"}
            </span>
          )}
        </div>

        <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
          <div>
            <h3
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}
            >
              Drafted Events
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
              Access your saved Manual Builder and AI Event Creator drafts anytime.
            </p>
          </div>

          <div
            className="pt-3 border-t flex items-center justify-between text-xs font-bold"
            style={{ borderColor: "var(--border)", color: "var(--accent)" }}
          >
            <span>Open Folder</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </motion.button>

      {/* Portal Popup to document.body so it always centers in the visible screen viewport */}
      {isClient && createPortal(modalContent, document.body)}
    </>
  );
}
