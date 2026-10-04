// src/hooks/useLevelUpCelebration.ts
"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { VerifyHitPayload } from "@/components/fx/VerifyHit";

/** When overall level rises, fire the grand level-up hit (replaces a plain XP pop). */
export function useLevelUpCelebration(
  setHit: React.Dispatch<React.SetStateAction<VerifyHitPayload | null>>,
) {
  const { profile } = useAuth();
  const lastLevel = useRef<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (lastLevel.current === null) {
      lastLevel.current = profile.level;
      return;
    }
    if (profile.level > lastLevel.current) {
      const fromLevel = lastLevel.current;
      lastLevel.current = profile.level;
      setHit({
        title: "Level up",
        body: profile.title,
        xp: profile.level,
        xpLabel: "New rank",
        fromLevel,
        toLevel: profile.level,
        kind: "level",
      });
    } else if (profile.level !== lastLevel.current) {
      lastLevel.current = profile.level;
    }
  }, [profile, setHit]);
}
