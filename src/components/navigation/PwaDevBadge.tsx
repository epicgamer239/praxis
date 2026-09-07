"use client";

import React, { useEffect, useState } from "react";

function isStandaloneDisplay() {
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosLegacy = "standalone" in navigator && Boolean(navigator.standalone);
  return media || iosLegacy;
}

export default function PwaDevBadge() {
  const [mode, setMode] = useState<"safari" | "icon" | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    setMode(isStandaloneDisplay() ? "icon" : "safari");
    setHost(window.location.host);
  }, []);

  if (!mode) return null;

  const isProdHost = host.includes("vercel.app");
  const label =
    mode === "icon"
      ? isProdHost
        ? "Icon · Vercel (not live)"
        : "Icon · local"
      : "Safari tab";

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed top-[max(0.5rem,env(safe-area-inset-top))] right-3 z-[70] px-2 py-1 rounded-lg text-[10px] font-medium border border-border-subtle bg-canvas-card text-ink-secondary"
    >
      {label} · reload
    </button>
  );
}
