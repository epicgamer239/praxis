"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function MobileHeader() {
  const { profile } = useAuth();

  return (
    <header className="praxis-mobile-header">
      <div>
        <p className="praxis-mobile-header__title">Praxis</p>
        <p className="praxis-mobile-header__sub">
          {profile?.guildName || "Join a guild"}
        </p>
      </div>
      {profile && (
        <p className="praxis-mobile-header__meta">
          {profile.streakDays}d · Lv {profile.level}
        </p>
      )}
    </header>
  );
}
