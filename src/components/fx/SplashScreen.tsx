// src/components/fx/SplashScreen.tsx
"use client";

import React, { useState } from "react";
import { unlockAndPlay } from "@/lib/sounds";
import { enableDeviceHeading } from "@/lib/deviceHeading";

/** Leaf only — no app-icon box. */
function MagicalLeaf({ entering }: { entering: boolean }) {
  return (
    <div
      className={`app-splash__leaf-stage${entering ? " is-entering" : ""}`}
      aria-hidden
    >
      <div className="app-splash__aura" />
      <div className="app-splash__rays">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={`app-splash__ray app-splash__ray--${i}`} />
        ))}
      </div>
      <div className="app-splash__sparks">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className={`app-splash__spark app-splash__spark--${i}`}
          />
        ))}
      </div>
      <svg
        className="app-splash__leaf"
        viewBox="100 90 300 290"
        width="200"
        height="200"
      >
        <defs>
          <linearGradient id="leafFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5FA882" />
            <stop offset="45%" stopColor="#3B6E57" />
            <stop offset="100%" stopColor="#2A5040" />
          </linearGradient>
          <linearGradient id="leafSheen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F0EFEA" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#F0EFEA" stopOpacity="0" />
          </linearGradient>
          <filter id="leafGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          className="app-splash__leaf-body"
          d="M 256 110 C 350 160 380 256 380 350 C 286 350 190 320 140 226 C 120 188 120 140 140 120 C 160 100 208 100 256 110 Z"
          fill="url(#leafFill)"
          filter="url(#leafGlow)"
        />
        <path
          className="app-splash__leaf-sheen"
          d="M 256 110 C 350 160 380 256 380 350 C 286 350 190 320 140 226 C 120 188 120 140 140 120 C 160 100 208 100 256 110 Z"
          fill="url(#leafSheen)"
        />
        <path
          className="app-splash__leaf-vein"
          d="M 256 110 C 240 240 240 240 380 350"
          stroke="#111312"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="app-splash__leaf-vein-glow"
          d="M 256 110 C 240 240 240 240 380 350"
          stroke="#A8D5C0"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle
          className="app-splash__leaf-core"
          cx="256"
          cy="256"
          r="14"
          fill="#F0EFEA"
        />
      </svg>
    </div>
  );
}

type SplashScreenProps = {
  /** When true, wait for an explicit tap (unlocks Safari audio). */
  needsTap?: boolean;
  onEnter?: () => void;
};

const ENTER_HOLD_MS = 1700;

/**
 * Branded boot splash.
 * Safari/PWA cannot autoplay sound — Tap to enter is the unlock gesture.
 */
export default function SplashScreen({
  needsTap = false,
  onEnter,
}: SplashScreenProps) {
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    if (!needsTap || entering) return;
    setEntering(true);
    // Must run in this tap — iOS drops motion permission after the splash delay.
    void enableDeviceHeading();
    unlockAndPlay("boot");
    window.setTimeout(() => onEnter?.(), ENTER_HOLD_MS);
  };

  return (
    <div
      className={`app-screen app-splash${needsTap ? " is-tappable" : ""}${entering ? " is-entering" : ""}`}
      role={needsTap ? "button" : undefined}
      tabIndex={needsTap ? 0 : undefined}
      onClick={needsTap ? handleEnter : undefined}
      onKeyDown={
        needsTap
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleEnter();
              }
            }
          : undefined
      }
    >
      <div className="app-splash__stage">
        <MagicalLeaf entering={entering || !needsTap} />
        <p className="app-splash__mark">Praxis</p>
        {needsTap && !entering && (
          <p className="app-splash__hint">Tap to enter</p>
        )}
      </div>
    </div>
  );
}
