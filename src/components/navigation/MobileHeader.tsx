// src/components/navigation/MobileHeader.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function MobileHeader() {
  const pathname = usePathname();
  const { profile } = useAuth();

  if (pathname === "/login") return null;

  return (
    <header className="praxis-mobile-header sticky top-0 z-30 border-b border-border-subtle bg-canvas-card/95 backdrop-blur-sm px-4 pb-3 items-center justify-between shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div>
        <p className="text-sm font-semibold tracking-tight text-ink-primary">
          Praxis
        </p>
        <p className="text-[11px] text-ink-muted truncate max-w-[70vw]">
          {profile?.guildName || "No Guild Active"}
        </p>
      </div>
      {profile && (
        <p className="text-[11px] text-ink-secondary text-right">
          {profile.streakDays}d · Lv {profile.level}
        </p>
      )}
    </header>
  );
}
