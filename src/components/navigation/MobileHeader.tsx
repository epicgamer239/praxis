"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function MobileHeader() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const onGuild = pathname.startsWith("/guild");

  return (
    <header className="praxis-mobile-header">
      <div>
        <p className="praxis-mobile-header__title">
          {onGuild ? "Guild" : "Praxis"}
        </p>
        {!onGuild && (
          <p className="praxis-mobile-header__sub">
            {profile?.guildName || "Join a guild"}
          </p>
        )}
      </div>
      {profile && (
        <p className="praxis-mobile-header__meta">
          {profile.streakDays}d · Lv {profile.level}
        </p>
      )}
    </header>
  );
}
