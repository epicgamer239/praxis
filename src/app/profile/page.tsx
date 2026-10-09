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
import {
  Users,
  Compass,
  Flame,
  BookOpen,
  Star,
  Zap,
} from "lucide-react";

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

function getCategoryBadge(attribute: string, category?: string) {
  switch (attribute) {
    case "social":
      return {
        icon: <Users size={14} className="shrink-0 text-orange-500" />,
        label: category || "Social",
      };
    case "energy":
      return {
        icon: <Flame size={14} className="shrink-0 text-green-500" />,
        label: category || "Energy",
      };
    case "wisdom":
      return {
        icon: <BookOpen size={14} className="shrink-0 text-sky-400" />,
        label: category || "Wisdom",
      };
    case "neighborhood":
    default:
      return {
        icon: <Compass size={14} className="shrink-0 text-yellow-500" />,
        label: category || "Neighborhood",
      };
  }
}

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

      <div className="p-4 rounded-2xl border border-border-subtle bg-canvas-card flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <MemberAvatar
            name={profile.name}
            userId={profile.id}
            lastSeenAtMs={Date.now()}
            size="profile"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-ink-primary leading-snug truncate">
              {profile.name}
            </h3>
            <p className="text-[11px] text-ink-secondary mt-0.5 truncate">{profile.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-right">
          <div className="flex flex-col items-end">
            <p className="text-2xl font-semibold text-white tabular-nums leading-normal">
              {verifiedCount}
            </p>
            <p className="text-[9px] text-gray-500 tracking-widest uppercase mt-0.5">
              DEEDS
            </p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-2xl font-semibold text-white tabular-nums leading-normal">
              {profile.totalVouchesGiven ?? 0}
            </p>
            <p className="text-[9px] text-gray-500 tracking-widest uppercase mt-0.5">
              VOUCHES
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
                className={`pl-3 py-3 border-l-4 ${attr.border} space-y-2.5`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-medium ${attr.textColor}`}>
                    {attr.name}
                  </span>
                  <span className="text-gray-400 tabular-nums">
                    Level {attr.stat.level} · {attr.stat.currentXp} /{" "}
                    {attr.stat.maxXp} XP
                  </span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${attr.color} transition-[width] duration-700`}
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
            {verifiedDeeds.map((deed) => {
              const categoryBadge = getCategoryBadge(
                deed.attribute,
                deed.attributeLabel,
              );
              const timeStr = deedDate(deed);

              return (
                <div
                  key={deed.id}
                  className={cn(
                    "pl-3 py-3 border-l-4 space-y-2.5",
                    BORDER_L_DEED[deed.attribute] || "border-l-border-strong",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Structural, high-density metadata tag row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
                          {categoryBadge.icon}
                          <span>{categoryBadge.label}</span>
                        </span>

                        <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
                          <Star size={14} className="shrink-0 text-amber-400" />
                          <span>+{deed.xpReward} XP</span>
                        </span>

                        {typeof deed.difficulty === "number" && (
                          <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
                            <Zap size={14} className="shrink-0 text-blue-400" />
                            <span>{deed.difficulty}/5</span>
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 text-white font-semibold text-base leading-snug">
                        {deed.questTitle}
                      </h3>
                      {deed.fieldNote && (
                        <p className="mt-1 text-gray-400 text-sm leading-snug italic">
                          &ldquo;{deed.fieldNote}&rdquo;
                        </p>
                      )}
                    </div>

                    {timeStr && (
                      <span className="text-xs text-gray-500 shrink-0 tabular-nums pt-0.5">
                        {timeStr}
                      </span>
                    )}
                  </div>

                  {deed.vouchedByNames && deed.vouchedByNames.length > 0 && (
                    <p className="text-xs text-ink-muted mt-2.5">
                      Vouched by {deed.vouchedByNames.join(" and ")}
                    </p>
                  )}
                </div>
              );
            })}
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
          . Change anytime and today&apos;s board will refresh.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {GOAL_OPTIONS.map((goal) => {
            const on = profile.goalId === goal.id;
            return (
              <button
                key={goal.id}
                type="button"
                disabled={savingGoal}
                onClick={() => setGoal(goal.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                  on
                    ? "bg-moss/30 text-white ring-1 ring-moss/50"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200",
                )}
              >
                {goal.label}
              </button>
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
