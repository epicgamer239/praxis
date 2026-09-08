"use client";

import React, { useEffect } from "react";
import { haptic } from "@/lib/haptics";

export type VerifyHitPayload = {
  title: string;
  body: string;
  xp: number;
  xpLabel: string;
  extra?: string;
  kind?: "xp" | "submit" | "level";
};

export default function VerifyHit({
  hit,
  onDone,
}: {
  hit: VerifyHitPayload | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!hit) return;
    haptic(hit.kind === "level" ? "heavy" : "success");
    const t = window.setTimeout(onDone, hit.kind === "level" ? 3800 : 3000);
    return () => window.clearTimeout(t);
  }, [hit, onDone]);

  if (!hit) return null;

  const level = hit.kind === "level";

  return (
    <div className="verify-hit" onClick={onDone} role="dialog">
      <div className="verify-hit__burst" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`verify-hit__spark verify-hit__spark--${i}`} />
        ))}
      </div>
      <div className={`verify-hit__card${level ? " is-level" : ""}`}>
        <p className="verify-hit__kicker">{hit.title}</p>
        <p className="verify-hit__xp">
          {level ? `Lv ${hit.xp}` : `+${hit.xp}`}
        </p>
        <p className="verify-hit__label">{hit.xpLabel}</p>
        <p className="verify-hit__body">{hit.body}</p>
        {hit.extra && <p className="verify-hit__extra">{hit.extra}</p>}
      </div>
    </div>
  );
}
