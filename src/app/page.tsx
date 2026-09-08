// src/app/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AttributeAmoeba from "@/components/amoeba/AttributeAmoeba";
import QuestCard from "@/components/quests/QuestCard";
import GuildGate from "@/components/guild/GuildGate";
import StreakCalendar from "@/components/streak/StreakCalendar";
import { useAuth } from "@/context/AuthContext";
import { getDailyQuestsForGuild } from "@/lib/questBank";
import {
  subscribeToUserSubmissionsToday,
  clearUserNudges,
} from "@/lib/firestoreService";
import { PeerSubmission, Quest } from "@/types";
import { formatLocalDate } from "@/lib/progression";

export default function DashboardPage() {
  const { profile, loading, user } = useAuth();
  const [userSubmissions, setUserSubmissions] = useState<PeerSubmission[]>([]);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("");

  const todayStr = useMemo(() => formatLocalDate(), []);
  const baseQuests = useMemo(() => {
    return getDailyQuestsForGuild(todayStr, profile?.guildId || "DEFAULT");
  }, [todayStr, profile?.guildId]);

  // Live countdown to midnight (12:00 AM)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight
      const diffMs = midnight.getTime() - now.getTime();

      if (diffMs <= 0) return "Resetting...";

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      return `${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeUntilMidnight(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeUntilMidnight(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeToUserSubmissionsToday(profile.id, (subs) => {
      setUserSubmissions(subs);
    });
    return () => unsub();
  }, [profile?.id]);

  const questsWithStatus: Quest[] = useMemo(() => {
    return baseQuests.map((q) => {
      const match = userSubmissions.find((s) => s.questId === q.id);
      if (match) {
        return {
          ...q,
          status: match.status,
          vouchesReceived: match.vouchesReceived,
          requiredVouches: match.requiredVouches,
          vouchedBy: match.vouchedByNames,
        };
      }
      return {
        ...q,
        status: "pending",
      };
    });
  }, [baseQuests, userSubmissions]);

  const nudgeBannerText = useMemo(() => {
    const names = profile?.nudgedByNames;
    if (!names || names.length === 0) return null;

    if (names.length === 1) {
      return `${names[0]} nudged you to step outside and complete today's quest.`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} nudged you to complete today's quest.`;
    } else {
      return `${names[0]}, ${names[1]}, and ${names.length - 2} other(s) nudged you to complete today's quest.`;
    }
  }, [profile?.nudgedByNames]);

  const handleDismissNudge = async () => {
    if (profile?.id) {
      await clearUserNudges(profile.id);
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="py-16 text-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  if (!profile.guildId) {
    return <GuildGate />;
  }

  const verifiedCount = questsWithStatus.filter(
    (q) => q.status === "verified",
  ).length;

  return (
    <div className="space-y-5">
      {nudgeBannerText && (
        <div className="p-4 rounded-2xl border border-attribute-social bg-canvas-card space-y-3">
          <p className="text-sm text-ink-primary leading-snug">
            {nudgeBannerText}
          </p>
          <button
            type="button"
            onClick={handleDismissNudge}
            className="text-sm text-ink-muted"
          >
            Dismiss
          </button>
        </div>
      )}

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
              Today
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {verifiedCount} of 3 verified · resets in {timeUntilMidnight || "…"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {questsWithStatus.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>

      <Link
        href="/guild"
        className="block p-4 rounded-2xl border border-border-subtle bg-canvas-card"
      >
        <p className="text-sm font-medium text-ink-primary">Review guild proofs</p>
        <p className="text-xs text-ink-muted mt-1">
          Two vouches unlock XP for a deed.
        </p>
      </Link>

      <StreakCalendar
        streakDays={profile.streakDays}
        activeDates={profile.activeDates}
        lastActiveDate={profile.lastActiveDate}
      />

      <div className="p-5 pb-6 rounded-2xl border border-border-subtle bg-canvas-card overflow-visible">
        <h3 className="text-sm font-medium text-ink-secondary mb-3">
          Your attributes
        </h3>
        <AttributeAmoeba attributes={profile.attributes} />
        <p className="text-xs text-ink-muted mt-3">
          {profile.totalVerifiedDeeds} verified deeds · {profile.title}
        </p>
      </div>
    </div>
  );
}
