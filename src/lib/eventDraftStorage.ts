"use client";

import { getTemplateById } from "@/lib/eventTemplates";
import type {
  AiConversationMessage,
  AiEventDraft,
  RegistrationFormField,
} from "@/services/aiEvent.service";

export type DraftSource = "manual" | "ai";
export type DraftSaveReason = "autosave" | "offline" | "navigation" | "error";

export interface ManualEventFormState {
  title: string;
  category: string;
  mode: string;
  start_date: string;
  end_date: string;
  location: string;
  description: string;
  capacity: string;
  registration_type: string;
  registration_fee: string;
  min_team_size: string;
  max_team_size: string;
  keywords?: string;
  banner_url?: string;
}

export interface ManualCustomFieldState {
  id: string;
  label: string;
  type: string;
  value: string;
  options?: string[];
}

export interface ManualDraftState {
  step: number;
  templateId: string;
  formData: ManualEventFormState;
  templateValues: Record<string, string>;
  customFields: ManualCustomFieldState[];
  regFormFields: RegistrationFormField[];
  isLocationSelected: boolean;
}

export interface AiDraftState {
  input: string;
  messages: AiConversationMessage[];
  draft: AiEventDraft;
  regFormFields: RegistrationFormField[];
  isLocationSelected: boolean;
}

export interface SavedEventDraft {
  id: string;
  source: DraftSource;
  title: string;
  category: string;
  mode?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  banner_url?: string;
  completionHint?: string;
  createdAt: string;
  updatedAt: string;
  lastReason?: DraftSaveReason;
  manualState?: ManualDraftState;
  aiState?: AiDraftState;
}

export interface DraftNotificationPayload {
  id: string;
  type: "DRAFT_SAVED";
  title: string;
  message: string;
  url: string;
  draftId: string;
  source: DraftSource;
  reason: Exclude<DraftSaveReason, "autosave">;
  created_at: string;
  expiresAt: number;
}

export interface LocalDraftNotificationItem {
  id: string;
  type: "DRAFT_SAVED";
  title: string;
  sub: string;
  eventName: string;
  url: string;
  draftId: string;
  isUnread: boolean;
  rawTime: string;
}

const DRAFT_LIST_PREFIX = "cc_event_drafts:";
const DRAFT_NOTIF_LIST_PREFIX = "cc_local_draft_notifications:";
const PENDING_DRAFT_NOTIF_KEY = "cc_pending_draft_notification";
const MAX_STORED_DRAFTS = 40;
const MAX_STORED_LOCAL_NOTIFS = 25;

export const DEFAULT_FALLBACK_COVER =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Resolve a stable per-user storage namespace key with guest fallback. */
export function getDraftOwnerKey(): string {
  if (!isBrowser()) return "guest";

  try {
    const directId = window.localStorage.getItem("cc_user_id");
    if (directId && directId.trim()) return directId.trim();

    const profile = safeParseJson<Record<string, unknown> | null>(
      window.localStorage.getItem("cc_user_profile"),
      null
    );
    const profileKey = profile?.id ?? profile?.user_id ?? profile?.email;
    if (profileKey !== undefined && profileKey !== null && String(profileKey).trim()) {
      return String(profileKey).trim();
    }

    const userObj = safeParseJson<Record<string, unknown> | null>(
      window.localStorage.getItem("user"),
      null
    );
    const userKey = userObj?.id ?? userObj?.user_id ?? userObj?.email;
    if (userKey !== undefined && userKey !== null && String(userKey).trim()) {
      return String(userKey).trim();
    }
  } catch {
    /* ignore storage errors */
  }

  return "guest";
}

function getDraftStorageKey(ownerKey = getDraftOwnerKey()): string {
  return `${DRAFT_LIST_PREFIX}${ownerKey}`;
}

function getNotifStorageKey(ownerKey = getDraftOwnerKey()): string {
  return `${DRAFT_NOTIF_LIST_PREFIX}${ownerKey}`;
}

export function createDraftId(source: DraftSource): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${source}_${Date.now()}_${rand}`;
}

function resolveCoverBanner(category?: string, explicitBanner?: unknown): string {
  if (typeof explicitBanner === "string" && explicitBanner.trim()) {
    return explicitBanner.trim();
  }
  if (category) {
    const template = getTemplateById(category);
    if (template?.imageUrl) return template.imageUrl;
  }
  return DEFAULT_FALLBACK_COVER;
}

function emitDraftsUpdated(): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent("cc_drafts_updated"));
  } catch {
    /* ignore */
  }
}

/** Return all saved drafts for the current user, sorted most recently updated first. */
export function listEventDrafts(): SavedEventDraft[] {
  if (!isBrowser()) return [];

  const ownerKey = getDraftOwnerKey();
  const primary = safeParseJson<SavedEventDraft[]>(
    window.localStorage.getItem(getDraftStorageKey(ownerKey)),
    []
  );
  const items = Array.isArray(primary) ? [...primary] : [];

  // Also include guest-bucket drafts created before user profile finished loading, deduplicated by id
  if (ownerKey !== "guest") {
    const guestItems = safeParseJson<SavedEventDraft[]>(
      window.localStorage.getItem(getDraftStorageKey("guest")),
      []
    );
    if (Array.isArray(guestItems) && guestItems.length > 0) {
      const seen = new Set(items.map((d) => d.id));
      for (const g of guestItems) {
        if (g?.id && !seen.has(g.id)) {
          items.push(g);
          seen.add(g.id);
        }
      }
    }
  }

  return items
    .filter((d) => d && typeof d.id === "string")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getEventDraftById(id: string): SavedEventDraft | null {
  if (!id || !isBrowser()) return null;
  return listEventDrafts().find((d) => d.id === id) || null;
}

function writeOwnerDrafts(drafts: SavedEventDraft[], ownerKey = getDraftOwnerKey()): void {
  if (!isBrowser()) return;
  try {
    const trimmed = drafts.slice(0, MAX_STORED_DRAFTS);
    window.localStorage.setItem(getDraftStorageKey(ownerKey), JSON.stringify(trimmed));
  } catch {
    // Fallback if storage quota is full: drop oldest drafts beyond top 10
    try {
      window.localStorage.setItem(getDraftStorageKey(ownerKey), JSON.stringify(drafts.slice(0, 10)));
    } catch {
      /* ignore quota failures */
    }
  }
}

function upsertDraft(nextDraft: SavedEventDraft): SavedEventDraft {
  const ownerKey = getDraftOwnerKey();
  const existingOwner = safeParseJson<SavedEventDraft[]>(
    window.localStorage.getItem(getDraftStorageKey(ownerKey)),
    []
  );
  const list = Array.isArray(existingOwner) ? existingOwner : [];
  const idx = list.findIndex((d) => d.id === nextDraft.id);
  const createdAt = idx >= 0 ? list[idx].createdAt : nextDraft.createdAt;
  const merged: SavedEventDraft = { ...nextDraft, createdAt };

  const updated = [merged, ...list.filter((d) => d.id !== nextDraft.id)];
  writeOwnerDrafts(updated, ownerKey);
  emitDraftsUpdated();
  return merged;
}

/** Save or update a Manual Event Builder draft. */
export function saveManualDraft(
  draftId: string,
  state: ManualDraftState,
  reason: DraftSaveReason = "autosave"
): SavedEventDraft {
  const now = new Date().toISOString();
  const title = (state.formData.title || "").trim() || "Untitled Event Draft";
  const category = (state.formData.category || state.templateId || "Custom").trim();
  const filledTemplateCount = Object.values(state.templateValues || {}).filter(
    (v) => String(v ?? "").trim().length > 0
  ).length;
  const totalDetailsHint =
    filledTemplateCount + state.customFields.length > 0
      ? `Step ${state.step} of 6 • ${filledTemplateCount + state.customFields.length} extra fields`
      : `Step ${state.step} of 6`;

  return upsertDraft({
    id: draftId,
    source: "manual",
    title,
    category,
    mode: state.formData.mode,
    location: state.formData.location?.trim() || undefined,
    start_date: state.formData.start_date || undefined,
    end_date: state.formData.end_date || undefined,
    description: state.formData.description?.trim() || undefined,
    banner_url: resolveCoverBanner(category, state.formData.banner_url),
    completionHint: totalDetailsHint,
    createdAt: now,
    updatedAt: now,
    lastReason: reason,
    manualState: state,
  });
}

/** Save or update an AI Event Creator draft. */
export function saveAiDraft(
  draftId: string,
  state: AiDraftState,
  reason: DraftSaveReason = "autosave"
): SavedEventDraft {
  const now = new Date().toISOString();
  const rawDraft = state.draft || {};
  const promptSnippet =
    state.input.trim() ||
    [...state.messages].reverse().find((m) => m.role === "user")?.content?.trim() ||
    "";
  const title =
    (typeof rawDraft.title === "string" && rawDraft.title.trim()) ||
    (promptSnippet ? promptSnippet.slice(0, 56) + (promptSnippet.length > 56 ? "..." : "") : "") ||
    "Untitled AI Event Draft";
  const category =
    (typeof rawDraft.type === "string" && rawDraft.type.trim()) || "Custom";

  const filledCoreCount = ["title", "description", "type", "mode", "start_date", "end_date", "location"].filter(
    (k) => {
      const val = rawDraft[k];
      return val !== undefined && val !== null && String(val).trim() !== "";
    }
  ).length;

  const completionHint =
    state.messages.length > 0
      ? `${filledCoreCount}/7 details • ${Math.ceil(state.messages.length / 2)} AI turns`
      : state.input.trim()
      ? "Prompt typed • ready to generate"
      : `${filledCoreCount}/7 details`;

  return upsertDraft({
    id: draftId,
    source: "ai",
    title,
    category,
    mode: typeof rawDraft.mode === "string" ? rawDraft.mode : undefined,
    location: typeof rawDraft.location === "string" ? rawDraft.location.trim() || undefined : undefined,
    start_date: typeof rawDraft.start_date === "string" ? rawDraft.start_date : undefined,
    end_date: typeof rawDraft.end_date === "string" ? rawDraft.end_date : undefined,
    description:
      typeof rawDraft.description === "string" && rawDraft.description.trim()
        ? rawDraft.description.trim()
        : promptSnippet || undefined,
    banner_url: resolveCoverBanner(category, rawDraft.banner_url),
    completionHint,
    createdAt: now,
    updatedAt: now,
    lastReason: reason,
    aiState: state,
  });
}

export function deleteEventDraft(draftId: string): void {
  if (!isBrowser() || !draftId) return;
  const ownerKey = getDraftOwnerKey();
  const keys = ownerKey === "guest" ? [getDraftStorageKey("guest")] : [getDraftStorageKey(ownerKey), getDraftStorageKey("guest")];

  for (const key of keys) {
    const existing = safeParseJson<SavedEventDraft[]>(window.localStorage.getItem(key), []);
    if (Array.isArray(existing) && existing.some((d) => d.id === draftId)) {
      const filtered = existing.filter((d) => d.id !== draftId);
      window.localStorage.setItem(key, JSON.stringify(filtered));
    }
  }
  emitDraftsUpdated();
}

export function clearAllEventDrafts(): void {
  if (!isBrowser()) return;
  const ownerKey = getDraftOwnerKey();
  window.localStorage.removeItem(getDraftStorageKey(ownerKey));
  if (ownerKey !== "guest") {
    window.localStorage.removeItem(getDraftStorageKey("guest"));
  }
  emitDraftsUpdated();
}

/** Detect whether the Manual Builder has user-supplied data worth saving as a draft. */
export function hasMeaningfulManualDraft(
  state: ManualDraftState,
  options?: { initialCategory?: string; initialRegKeys?: string[] }
): boolean {
  const f = state.formData;
  if (state.step > 1) return true;
  if (
    [f.title, f.description, f.start_date, f.end_date, f.location, f.keywords, f.banner_url].some(
      (v) => typeof v === "string" && v.trim().length > 0
    )
  ) {
    return true;
  }
  if (f.capacity && String(f.capacity).trim() !== "" && String(f.capacity).trim() !== "0") return true;
  if (f.registration_fee && Number(f.registration_fee) > 0) return true;
  if (f.mode && f.mode !== "offline") return true;
  if (f.registration_type && f.registration_type !== "solo") return true;
  if (
    (f.min_team_size && String(f.min_team_size).trim() !== "1") ||
    (f.max_team_size && String(f.max_team_size).trim() !== "4")
  ) {
    return true;
  }
  if (options?.initialCategory && f.category !== options.initialCategory) return true;

  if (Object.values(state.templateValues || {}).some((v) => String(v ?? "").trim().length > 0)) {
    return true;
  }
  if (state.customFields.length > 0) return true;

  if (options?.initialRegKeys) {
    const currentKeys = state.regFormFields.map((r) => `${r.key}:${r.label}:${r.required}`).join("|");
    const initialJoined = options.initialRegKeys.join("|");
    if (currentKeys !== initialJoined) return true;
  }

  return false;
}

/** Detect whether the AI Event Creator has user-supplied data worth saving as a draft. */
export function hasMeaningfulAiDraft(state: AiDraftState): boolean {
  if (state.input.trim().length > 0) return true;
  if (state.messages.length > 0) return true;
  if (state.draft && Object.keys(state.draft).length > 0) {
    return Object.entries(state.draft).some(([key, value]) => {
      if (key === "registration_form_schema") {
        return Array.isArray(value) && value.length > 0;
      }
      if (value === undefined || value === null) return false;
      if (Array.isArray(value)) return value.length > 0;
      return String(value).trim().length > 0;
    });
  }
  return false;
}

/** Save local draft notification history and broadcast in-app notification immediately & across navigation. */
export function notifyDraftSaved(
  draft: SavedEventDraft,
  reason: Exclude<DraftSaveReason, "autosave">
): DraftNotificationPayload | null {
  if (!isBrowser()) return null;

  const nowIso = new Date().toISOString();
  const title =
    reason === "offline"
      ? "Offline — Event saved in draft"
      : reason === "error"
      ? "Connection interrupted — Event saved in draft"
      : "Event saved in draft";
  const sourceLabel = draft.source === "ai" ? "AI Event Creator" : "Manual Builder";
  const message = `"${draft.title}" (${sourceLabel}) is saved in your Drafts folder.`;
  const url = `/events/create?folder=drafts&highlight=${encodeURIComponent(draft.id)}`;
  const id = `draft_notif_${draft.id}_${Date.now()}`;

  const payload: DraftNotificationPayload = {
    id,
    type: "DRAFT_SAVED",
    title,
    message,
    url,
    draftId: draft.id,
    source: draft.source,
    reason,
    created_at: nowIso,
    expiresAt: Date.now() + 20_000,
  };

  try {
    window.localStorage.setItem(PENDING_DRAFT_NOTIF_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }

  // Persist into local notification center feed so /notifications also reflects it
  try {
    const notifKey = getNotifStorageKey();
    const existing = safeParseJson<LocalDraftNotificationItem[]>(
      window.localStorage.getItem(notifKey),
      []
    );
    const list = Array.isArray(existing) ? existing : [];
    const entry: LocalDraftNotificationItem = {
      id,
      type: "DRAFT_SAVED",
      title,
      sub: message,
      eventName: "Saved Drafts",
      url,
      draftId: draft.id,
      isUnread: true,
      rawTime: nowIso,
    };
    // Deduplicate consecutive entries for the same draft so list stays clean
    const filtered = list.filter((n) => n.draftId !== draft.id);
    window.localStorage.setItem(
      notifKey,
      JSON.stringify([entry, ...filtered].slice(0, MAX_STORED_LOCAL_NOTIFS))
    );
  } catch {
    /* ignore */
  }

  try {
    window.dispatchEvent(new CustomEvent("cc_trigger_notification", { detail: payload }));
    window.dispatchEvent(new CustomEvent("cc_draft_saved_toast", { detail: payload }));
  } catch {
    /* ignore */
  }

  return payload;
}

export function peekPendingDraftNotification(): DraftNotificationPayload | null {
  if (!isBrowser()) return null;
  const payload = safeParseJson<DraftNotificationPayload | null>(
    window.localStorage.getItem(PENDING_DRAFT_NOTIF_KEY),
    null
  );
  if (!payload || typeof payload.expiresAt !== "number" || Date.now() > payload.expiresAt) {
    window.localStorage.removeItem(PENDING_DRAFT_NOTIF_KEY);
    return null;
  }
  return payload;
}

export function clearPendingDraftNotification(id?: string): void {
  if (!isBrowser()) return;
  if (!id) {
    window.localStorage.removeItem(PENDING_DRAFT_NOTIF_KEY);
    return;
  }
  const current = safeParseJson<DraftNotificationPayload | null>(
    window.localStorage.getItem(PENDING_DRAFT_NOTIF_KEY),
    null
  );
  if (!current || current.id === id) {
    window.localStorage.removeItem(PENDING_DRAFT_NOTIF_KEY);
  }
}

export function listLocalDraftNotifications(): LocalDraftNotificationItem[] {
  if (!isBrowser()) return [];
  const ownerKey = getDraftOwnerKey();
  const primary = safeParseJson<LocalDraftNotificationItem[]>(
    window.localStorage.getItem(getNotifStorageKey(ownerKey)),
    []
  );
  return Array.isArray(primary) ? primary : [];
}

export function markLocalDraftNotificationRead(id: string): void {
  if (!isBrowser() || !id) return;
  const key = getNotifStorageKey();
  const existing = safeParseJson<LocalDraftNotificationItem[]>(
    window.localStorage.getItem(key),
    []
  );
  if (!Array.isArray(existing) || existing.length === 0) return;
  const updated = existing.map((n) => (n.id === id ? { ...n, isUnread: false } : n));
  window.localStorage.setItem(key, JSON.stringify(updated));
}

export function markAllLocalDraftNotificationsRead(): void {
  if (!isBrowser()) return;
  const key = getNotifStorageKey();
  const existing = safeParseJson<LocalDraftNotificationItem[]>(
    window.localStorage.getItem(key),
    []
  );
  if (!Array.isArray(existing) || existing.length === 0) return;
  const updated = existing.map((n) => ({ ...n, isUnread: false }));
  window.localStorage.setItem(key, JSON.stringify(updated));
}

export function removeNotificationsForDraft(draftId: string): void {
  if (!isBrowser() || !draftId) return;
  clearPendingDraftNotification();
  const key = getNotifStorageKey();
  const existing = safeParseJson<LocalDraftNotificationItem[]>(
    window.localStorage.getItem(key),
    []
  );
  if (Array.isArray(existing) && existing.some((n) => n.draftId === draftId)) {
    window.localStorage.setItem(
      key,
      JSON.stringify(existing.filter((n) => n.draftId !== draftId))
    );
  }
}

const navNotifyTimers: Partial<Record<DraftSource, number>> = {};

/**
 * Delay cross-page navigation notification slightly (~120ms) so React 18
 * StrictMode double-mounts cancel it, while real route changes fire cleanly.
 */
export function scheduleNavigationDraftNotify(
  source: DraftSource,
  savedDraft: SavedEventDraft
): void {
  if (!isBrowser()) return;
  cancelNavigationDraftNotify(source);
  navNotifyTimers[source] = window.setTimeout(() => {
    delete navNotifyTimers[source];
    notifyDraftSaved(savedDraft, "navigation");
  }, 120);
}

export function cancelNavigationDraftNotify(source: DraftSource): void {
  if (!isBrowser()) return;
  const existing = navNotifyTimers[source];
  if (existing !== undefined) {
    window.clearTimeout(existing);
    delete navNotifyTimers[source];
  }
}

export function formatRelativeDraftTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "Recently";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}
