"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  clearPendingDraftNotification,
  peekPendingDraftNotification,
} from "@/lib/eventDraftStorage";

/**
 * Replays pending draft-saved notifications across Next.js route transitions
 * so NotificationBellIsland on the destination page displays them in the top-right Dynamic Island.
 */
export default function DraftNotificationBridge() {
  const pathname = usePathname();
  const replayedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pending = peekPendingDraftNotification();
    if (!pending || replayedIdsRef.current.has(pending.id)) return;
    replayedIdsRef.current.add(pending.id);

    const dispatchPending = () => {
      try {
        window.dispatchEvent(new CustomEvent("cc_trigger_notification", { detail: pending }));
      } catch {
        /* ignore */
      }
    };

    const t1 = window.setTimeout(dispatchPending, 140);
    const t2 = window.setTimeout(() => {
      dispatchPending();
      clearPendingDraftNotification(pending.id);
    }, 450);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
