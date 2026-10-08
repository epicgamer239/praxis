// src/app/profile/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import StreakCalendar from "@/components/streak/StreakCalendar";
import MemberAvatar from "@/components/guild/MemberAvatar";
import {
  claimPendingVerifiedRewards,
  saveUserGoal,
  subscribeToUserVerifiedDeeds,
} from "@/lib/firestoreService";
import { formatRelativeTime } from "@/lib/progression";
import {
  DEFAULT_QUEST_DIFFICULTY,
  GOAL_OPTIONS,
  labelForGoal,
} from "@/lib/goals";
import { ATTRIBUTE_TEXT, cn } from "@/lib/utils";
import { GoalId, PeerSubmission } from "@/types";

function deedDate(deed: PeerSubmission): string {
  const raw = (deed.verifiedAt || deed.createdAt) as {
    toDate?: () => Date;
    seconds?: number;
  } | Date | string | null;
  if (!raw) return "";
  let d: Date | null = null;
  if (typeof raw === "object" && raw && "toDate" in raw && typeof raw.toDate === "function") {
    d = raw.toDate();
  } else if (raw instanceof Date) {
    d = raw;
  } else if (typeof raw === "object" && typeof raw.seconds === "number") {
    d = new Date(raw.seconds * 1000);
  } else {
    const parsed = new Date(raw as string);
    if (!Number.isNaN(parsed.getTime())) d = parsed;
  }
  if (!d) return "";
  return formatRelativeTime(d);
}

const BORDER_L_DEED: Record<string, string> = {
  neighborhood: "border-l-attribute-neighborhood",
  energy: "border-l-attribute-energy",
  social: "border-l-attribute-social",
  wisdom: "border-l-attribute-wisdom",
};

export default function ProfilePage() {
  const { profile, loading, signOut } = useAuth();
  const [verifiedDeeds, setVerifiedDeeds] = useState<PeerSubmission[]>([]);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    const unsub = subscribeToUserVerifiedDeeds(profile.id, (deeds) => {
      setVerifiedDeeds(deeds);
    });
    return () => unsub();
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    void claimPendingVerifiedRewards(profile.id).catch(() => {
      /* best-effort */
    });
  }, [profile?.id, verifiedDeeds.length]);

  if (loading || !profile) {
    return (
      <div className="py-16 text-center text-sm text-ink-muted">Loading…</div>
    );
  }

  const verifiedCount = Math.max(
    profile.totalVerifiedDeeds || 0,
    verifiedDeeds.length,
  );
  const band = Math.round(
    profile.questDifficulty ?? DEFAULT_QUEST_DIFFICULTY,
  );

  const attributes = [
    {
      key: "neighborhood",
      name: "Neighborhood",
      stat: profile.attributes.neighborhood,
      color: "bg-attribute-neighborhood",
      textColor: "text-attribute-neighborhood",
      border: "border-l-attribute-neighborhood",
    },
    {
      key: "energy",
      name: "Energy",
      stat: profile.attributes.energy,
      color: "bg-attribute-energy",
      textColor: "text-attribute-energy",
      border: "border-l-attribute-energy",
    },
    {
      key: "social",
      name: "Social",
      stat: profile.attributes.social,
      color: "bg-attribute-social",
      textColor: "text-attribute-social",
      border: "border-l-attribute-social",
    },
    {
      key: "wisdom",
      name: "Wisdom",
      stat: profile.attributes.wisdom,
      color: "bg-attribute-wisdom",
      textColor: "text-attribute-wisdom",
      border: "border-l-attribute-wisdom",
    },
  ];

  const setGoal = (goalId: GoalId) => {
    if (!profile.id || profile.goalId === goalId || savingGoal) return;
    setSavingGoal(true);
    void saveUserGoal(profile.id, goalId)
      .catch(() => {
        /* ignore */
      })
      .finally(() => setSavingGoal(false));
  };

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-border-subtle">
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          You
        </h2>
      </div>

      <div className="p-5 rounded-2xl border border-border-subtle bg-canvas-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <MemberAvatar
            name={profile.name}
            userId={profile.id}
            lastSeenAtMs={Date.now()}
            size="profile"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-ink-primary">
              {profile.name}
            </h3>
            <p className="text-xs text-ink-secondary mt-0.5 truncate">{profile.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 shrink-0 text-right">
          <div className="flex flex-col items-end">
            <p className="text-3xl font-semibold text-white tabular-nums">
              {verifiedCount}
            </p>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5">
              VERIFIED DEEDS
            </p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-3xl font-semibold text-white tabular-nums">
              {profile.totalVouchesGiven ?? 0}
            </p>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5">
              VOUCHES GIVEN
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-ink-secondary">
          Compass progression
        </h3>
        <div className="space-y-3">
          {attributes.map((attr) => {
            const progressPct = Math.min(
              100,
              Math.round((attr.stat.currentXp / attr.stat.maxXp) * 100),
            );
            return (
              <div
                key={attr.key}
                className={`pl-3 py-3 border-l-4 ${attr.border} space-y-2`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-medium ${attr.textColor}`}>
                    {attr.name}
                  </span>
                  <span className="text-ink-secondary tabular-nums">
                    Level {attr.stat.level} · {attr.stat.currentXp} /{" "}
                    {attr.stat.maxXp} XP
                  </span>
                </div>
                <div className="w-full h-1.5 rounded bg-canvas-subtle overflow-hidden">
                  <div
                    className={`h-full ${attr.color} transition-[width] duration-700`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-ink-secondary">Your deeds</h3>
        {verifiedDeeds.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing verified yet. Finished deeds land here.
          </p>
        ) : (
          <div className="space-y-3">
            {verifiedDeeds.map((deed) => (
              <div
                key={deed.id}
                className={cn(
                  "pl-3 py-2.5 border-l-[3px] space-y-2",
                  BORDER_L_DEED[deed.attribute] || "border-l-border-strong",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium ${ATTRIBUTE_TEXT[deed.attribute]}`}
                    >
                      {deed.attributeLabel} · +{deed.xpReward} XP
                    </p>
                    <p className="text-sm font-medium text-ink-primary mt-1 leading-snug">
                      {deed.questTitle}
                    </p>
                  </div>
                  {deedDate(deed) && (
                    <span className="text-xs text-ink-muted shrink-0 tabular-nums">
                      {deedDate(deed)}
                    </span>
                  )}
                </div>
                {deed.fieldNote && (
                  <p className="text-xs text-ink-secondary italic">
                    &ldquo;{deed.fieldNote}&rdquo;
                  </p>
                )}
                {deed.vouchedByNames.length > 0 && (
                  <p className="text-xs text-ink-muted">
                    Vouched by {deed.vouchedByNames.join(" and ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <StreakCalendar
        streakDays={profile.streakDays}
        activeDates={profile.activeDates}
        lastActiveDate={profile.lastActiveDate}
      />

      <div className="space-y-3 pt-2 border-t border-border-subtle">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium text-ink-secondary">Goal</h3>
          <p className="text-xs text-ink-muted tabular-nums">
            Difficulty band {band}/5
          </p>
        </div>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Quests adapt to{" "}
          <span className="text-ink-primary font-medium">
            {labelForGoal(profile.goalId).toLowerCase()}
          </span>
          . Change anytime — today&apos;s board refreshes.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          {GOAL_OPTIONS.map((goal, i) => {
            const on = profile.goalId === goal.id;
            return (
              <React.Fragment key={goal.id}>
                {i > 0 && (
                  <span className="text-ink-muted text-xs" aria-hidden>
                    ·
                  </span>
                )}
                <button
                  type="button"
                  disabled={savingGoal}
                  onClick={() => setGoal(goal.id)}
                  className={cn(
                    "text-sm pb-0.5 transition-colors",
                    on
                      ? "text-ink-primary font-medium border-b border-ink-primary"
                      : "text-ink-muted hover:text-ink-secondary",
                  )}
                >
                  {goal.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        className="praxis-btn praxis-btn--ghost"
      >
        Log out
      </button>
    </div>
  );
}
