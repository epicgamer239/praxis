// src/components/fx/SplashScreen.tsx
"use client";

import React, { useEffect } from "react";
import { playSound } from "@/lib/sounds";

function LeafMark() {
  return (
    <svg
      className="app-splash__leaf"
      viewBox="0 0 512 512"
      width="88"
      height="88"
      aria-hidden
    >
      <rect width="512" height="512" rx="128" fill="#111312" />
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="104"
        fill="#191C1B"
        stroke="#282E2A"
        strokeWidth="8"
      />
      <path
        className="app-splash__leaf-body"
        d="M 256 110 C 350 160 380 256 380 350 C 286 350 190 320 140 226 C 120 188 120 140 140 120 C 160 100 208 100 256 110 Z"
        fill="#3B6E57"
      />
      <path
        className="app-splash__leaf-vein"
        d="M 256 110 C 240 240 240 240 380 350"
        stroke="#111312"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        className="app-splash__leaf-core"
        cx="256"
        cy="256"
        r="16"
        fill="#F0EFEA"
      />
    </svg>
  );
}

/** Branded boot splash — leaf + Praxis + soft chime. */
export default function SplashScreen() {
  useEffect(() => {
    playSound("boot");
  }, []);

  return (
    <div className="app-screen app-splash">
      <div className="app-splash__stage">
        <div className="app-splash__icon-wrap">
          <LeafMark />
        </div>
        <p className="app-splash__mark">Praxis</p>
      </div>
    </div>
  );
}
