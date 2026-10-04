"use client";

import React, { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";
import { playSound, soundForHitKind } from "@/lib/sounds";

export type VerifyHitPayload = {
  title: string;
  body: string;
  xp: number;
  xpLabel: string;
  extra?: string;
  kind?: "xp" | "submit" | "level" | "vouch";
  fromLevel?: number;
  toLevel?: number;
};

export default function VerifyHit({
  hit,
  onDone,
}: {
  hit: VerifyHitPayload | null;
  onDone: () => void;
}) {
  const level = hit?.kind === "level";
  const [barOn, setBarOn] = useState(false);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (!hit) {
      setBarOn(false);
      setReveal(false);
      return;
    }
    haptic(level ? "heavy" : "success");
    playSound(soundForHitKind(hit.kind));

    if (!level) {
      const t = window.setTimeout(onDone, 3000);
      return () => window.clearTimeout(t);
    }

    setBarOn(false);
    setReveal(false);
    const fill = window.setTimeout(() => setBarOn(true), 80);
    const show = window.setTimeout(() => setReveal(true), 1100);
    const done = window.setTimeout(onDone, 4800);
    return () => {
      window.clearTimeout(fill);
      window.clearTimeout(show);
      window.clearTimeout(done);
    };
  }, [hit, level, onDone]);

  if (!hit) return null;

  const fromLevel = hit.fromLevel ?? Math.max(1, (hit.toLevel ?? hit.xp) - 1);
  const toLevel = hit.toLevel ?? hit.xp;

  return (
    <div className="verify-hit" onClick={onDone} role="dialog">
      <div className="verify-hit__burst" aria-hidden>
        {Array.from({ length: level ? 14 : 10 }, (_, i) => (
          <span key={i} className={`verify-hit__spark verify-hit__spark--${i % 10}`} />
        ))}
      </div>
      <div className={`verify-hit__card${level ? " is-level" : ""}`}>
        <p className="verify-hit__kicker">{hit.title}</p>

        {level ? (
          <>
            <div className="verify-hit__level-track">
              <div className="verify-hit__level-row">
                <span>Lv {fromLevel}</span>
                <span>Lv {toLevel}</span>
              </div>
              <div className="verify-hit__level-bar">
                <div
                  className={`verify-hit__level-fill${barOn ? " is-on" : ""}`}
                />
              </div>
            </div>
            <p
              className={`verify-hit__xp verify-hit__xp--level${reveal ? " is-in" : ""}`}
            >
              Lv {toLevel}
            </p>
            <p className={`verify-hit__label${reveal ? " is-in" : ""}`}>
              {hit.xpLabel}
            </p>
            <p className={`verify-hit__body${reveal ? " is-in" : ""}`}>
              {hit.body}
            </p>
          </>
        ) : (
          <>
            <p className="verify-hit__xp">+{hit.xp}</p>
            <p className="verify-hit__label">{hit.xpLabel}</p>
            <p className="verify-hit__body">{hit.body}</p>
            {hit.extra && <p className="verify-hit__extra">{hit.extra}</p>}
          </>
        )}
      </div>
    </div>
  );
}
