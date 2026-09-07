"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function MobileHeader() {
  const { profile } = useAuth();

  return (
    <header className="praxis-mobile-header">
      <p className="praxis-mobile-header__title">Praxis</p>
      {profile && (
        <p className="praxis-mobile-header__meta">
          {profile.streakDays}d · Lv {profile.level}
        </p>
      )}
    </header>
  );
}
