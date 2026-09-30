// src/hooks/usePresenceHeartbeat.ts
"use client";

import { useEffect } from "react";
import { touchLastSeen } from "@/lib/firestoreService";
import { HEARTBEAT_MS } from "@/lib/presence";

/** Keep lastSeenAt fresh while the app is open and visible. */
export function usePresenceHeartbeat(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const beat = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void touchLastSeen(userId).catch(() => {
        /* best-effort */
      });
    };

    beat();
    const interval = window.setInterval(beat, HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);
}
