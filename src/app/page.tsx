// src/app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CompassInstrument from "@/components/compass/CompassInstrument";
import QuestCard from "@/components/quests/QuestCard";
import GuildGate from "@/components/guild/GuildGate";
import GoalGate from "@/components/goals/GoalGate";
import VerifyHit, { VerifyHitPayload } from "@/components/fx/VerifyHit";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  WEEKLY_REROLLS,
  resolveDailyBoard,
} from "@/lib/questBank";
import { DEFAULT_QUEST_DIFFICULTY, labelForGoal } from "@/lib/goals";
import {
  ensureRerollBudget,
  ensureSharedQuestBank,
  rerollDailyQuestSlot,
  subscribeToGuildSubmissions,
  subscribeToUserSubmissionsToday,
} from "@/lib/firestoreService";
import { PeerSubmission, Quest, GuildActivityItem } from "@/types";
import {
  formatLocalDate,
  getWeekStart,
  VOUCH_BONUS_XP,
} from "@/lib/progression";
import { useFieldConditions } from "@/hooks/useFieldConditions";
import { weatherHint } from "@/lib/fieldConditions";
import { GeneratedBankQuest } from "@/lib/generatedQuests";
import ActivityFeed from "@/components/guild/ActivityFeed";
import { buildGuildActivity } from "@/lib/guildActivity";
import { playSound, armAudioFromGesture } from "@/lib/sounds";

export default function DashboardPage() {
  const { profile, loading, user } = useAuth();
  const { toast } = useToast();
  const { field } = useFieldConditions();
  const [userSubmissions, setUserSubmissions] = useState<PeerSubmission[]>([]);
  const [localQuests, setLocalQuests] = useState<GeneratedBankQuest[]>([]);
  const [activity, setActivity] = useState<GuildActivityItem[]>([]);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("");
  const [hit, setHit] = useState<VerifyHitPayload | null>(null);
  const [rerollingSlot, setRerollingSlot] = useState<number | null>(null);
  const seenVerified = useRef<Set<string> | null>(null);
  const lastLevel = useRef<number | null>(null);

  const todayStr = useMemo(() => formatLocalDate(), []);
  const weatherMood = field?.mood || "unknown";

  useEffect(() => {
    if (!field?.place || field.mood === "unknown") return;
    let cancelled = false;
    void ensureSharedQuestBank({
      place: field.place,
      dateStr: todayStr,
      mood: field.mood,
      weatherLabel: field.weatherLabel,
      airLabel: field.airLabel,
    })
      .then(({ quests }) => {
        if (!cancelled) setLocalQuests(quests);
      })
      .catch(() => {
        if (!cancelled) setLocalQuests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [field?.place, field?.mood, field?.weatherLabel, field?.airLabel, todayStr]);

  useEffect(() => {
    if (!profile?.id) return;
    void ensureRerollBudget(profile.id, profile).catch(() => {
      /* best-effort */
    });
  }, [profile?.id, profile?.rerollWeekStart, profile?.rerollsRemaining]);

  useEffect(() => {
    if (!profile?.guildId) {
      setActivity([]);
      return;
    }
    return subscribeToGuildSubmissions(profile.guildId, (subs) => {
      setActivity(buildGuildActivity(subs, 8));
    });
  }, [profile?.guildId]);

  const adaptive = useMemo(
    () => ({
      goalId: profile?.goalId,
      difficulty: profile?.questDifficulty ?? DEFAULT_QUEST_DIFFICULTY,
    }),
    [profile?.goalId, profile?.questDifficulty],
  );

  const baseQuests = useMemo(() => {
    if (!profile?.id) return [];
    return resolveDailyBoard(
      todayStr,
      profile.id,
      weatherMood,
      localQuests,
      profile.dailyQuestDate,
      profile.dailyQuestIds,
      adaptive,
    );
  }, [
    todayStr,
    profile?.id,
    profile?.dailyQuestDate,
    profile?.dailyQuestIds,
    weatherMood,
    localQuests,
    adaptive,
  ]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
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
    let first = true;
    const unsub = subscribeToUserSubmissionsToday(profile.id, (subs) => {
      if (first) {
        first = false;
        seenVerified.current = new Set(
          subs.filter((s) => s.status === "verified").map((s) => s.id),
        );
      } else if (seenVerified.current) {
        for (const sub of subs) {
          if (sub.status === "verified" && !seenVerified.current.has(sub.id)) {
            seenVerified.current.add(sub.id);
            window.setTimeout(() => {
              setHit((current) =>
                current?.kind === "level"
                  ? current
                  : {
                      title: "Verified",
                      body: sub.questTitle,
                      xp: sub.xpReward,
                      xpLabel: sub.attributeLabel,
                      kind: "xp",
                    },
              );
            }, 450);
            break;
          }
        }
      }
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

  const weekStart = formatLocalDate(getWeekStart());
  const rerollsLeft =
    profile?.rerollWeekStart === weekStart
      ? (profile.rerollsRemaining ?? WEEKLY_REROLLS)
      : WEEKLY_REROLLS;

  const lockedQuestIds = useMemo(
    () => userSubmissions.map((s) => s.questId),
    [userSubmissions],
  );

  const handleReroll = async (slotIndex: number) => {
    if (!profile?.id || rerollingSlot !== null) return;
    armAudioFromGesture();
    setRerollingSlot(slotIndex);
    try {
      const result = await rerollDailyQuestSlot({
        userId: profile.id,
        slotIndex,
        mood: weatherMood,
        localQuests,
        lockedQuestIds,
      });
      playSound("soft");
      toast(
        `Easier quest lined up · ${result.remaining} reroll${result.remaining === 1 ? "" : "s"} left`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reroll failed.";
      toast(message);
    } finally {
      setRerollingSlot(null);
    }
  };

  useEffect(() => {
    if (!profile) return;
    if (lastLevel.current === null) {
      lastLevel.current = profile.level;
      return;
    }
    if (profile.level > lastLevel.current) {
      lastLevel.current = profile.level;
      setHit({
        title: "Level up",
        body: profile.title,
        xp: profile.level,
        xpLabel: "New rank unlocked",
        kind: "level",
      });
    }
  }, [profile]);

  if (loading || !user || !profile) {
    return (
      <div className="py-16 text-center text-sm text-ink-muted">Loading…</div>
    );
  }

  if (!profile.goalId) {
    return <GoalGate />;
  }

  if (!profile.guildId) {
    return <GuildGate />;
  }

  const verifiedCount = questsWithStatus.filter(
    (q) => q.status === "verified",
  ).length;

  return (
    <div className="space-y-5">
      <VerifyHit hit={hit} onDone={() => setHit(null)} />

      <CompassInstrument
        attributes={profile.attributes}
        level={profile.level}
        streakDays={profile.streakDays}
      />

      <div className="pt-0.5">
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          Today ({verifiedCount}/3)
        </h2>
        <p className="text-sm text-ink-muted mt-1">
          {labelForGoal(profile.goalId)}
          {field && field.mood !== "unknown"
            ? ` · ${weatherHint(field.mood, field.airBand)}`
            : ""}
        </p>
        <p className="text-xs text-ink-muted mt-0.5 tabular-nums">
          Resets in {timeUntilMidnight || "…"}
          {` · ${rerollsLeft} reroll${rerollsLeft === 1 ? "" : "s"} left`}
        </p>
      </div>

      <div className="space-y-4">
        {questsWithStatus.map((quest, idx) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            canReroll={
              rerollsLeft > 0 &&
              (!quest.status || quest.status === "pending")
            }
            rerolling={rerollingSlot === idx}
            onReroll={() => handleReroll(idx)}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Guild activity
        </h3>
        <ActivityFeed items={activity} />
      </div>

      <Link
        href="/verify"
        className="block py-3 border-l-4 border-l-attribute-social pl-3"
      >
        <p className="text-sm font-medium text-ink-primary">
          Help others · +{VOUCH_BONUS_XP} Social
        </p>
        <p className="text-sm text-ink-muted mt-1">
          Vouch a guildmate&apos;s proof. You get XP too.
        </p>
      </Link>
    </div>
  );
}
