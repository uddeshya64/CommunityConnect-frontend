/**
 * Parse an event fee / price value from numbers or formatted strings (e.g., "₹500", "0", "Free", "").
 * Empty, null, undefined, non-positive, or "Free" values normalize to 0.
 */
export function parseNumericFee(rawFee: unknown): number {
  if (rawFee === null || rawFee === undefined) return 0;
  if (typeof rawFee === "number") {
    return Number.isFinite(rawFee) && rawFee > 0 ? rawFee : 0;
  }

  const trimmed = String(rawFee).trim();
  if (!trimmed || /^free(\b|$)/i.test(trimmed)) return 0;

  const cleaned = trimmed.replace(/[₹,\s]/g, "");
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

/**
 * Returns true when an event is free (unfilled, null, undefined, or 0).
 */
export function isFreeFee(rawFee: unknown): boolean {
  return parseNumericFee(rawFee) <= 0;
}

/**
 * Extracts the raw fee value from varying backend / UI event shapes.
 */
export function getRawEventFee(evt: { registration_fee?: unknown; ticket_price?: unknown; fee?: unknown } | null | undefined): unknown {
  if (!evt) return 0;
  return evt.registration_fee ?? evt.ticket_price ?? evt.fee ?? 0;
}

/**
 * Formats an event fee cleanly as "Free" (for empty / 0) or "₹<amount>".
 */
export function formatEventFee(rawFee: unknown): string {
  const numeric = parseNumericFee(rawFee);
  if (numeric <= 0) return "Free";
  return `₹${numeric.toLocaleString("en-IN")}`;
}

