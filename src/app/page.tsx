// src/app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AttributeAmoeba from "@/components/amoeba/AttributeAmoeba";
import QuestCard from "@/components/quests/QuestCard";
import GuildGate from "@/components/guild/GuildGate";
import StreakCalendar from "@/components/streak/StreakCalendar";
import VerifyHit, { VerifyHitPayload } from "@/components/fx/VerifyHit";
import { useAuth } from "@/context/AuthContext";
import { getDailyQuestsForGuild } from "@/lib/questBank";
import {
  subscribeToUserSubmissionsToday,
} from "@/lib/firestoreService";
import { PeerSubmission, Quest } from "@/types";
import { formatLocalDate, VOUCH_BONUS_XP } from "@/lib/progression";
import { useFieldConditions } from "@/hooks/useFieldConditions";
import { weatherHint } from "@/lib/fieldConditions";
import { GeneratedBankQuest } from "@/lib/generatedQuests";
import { persistGeneratedQuests } from "@/lib/questRuntime";

export default function DashboardPage() {
  const { profile, loading, user } = useAuth();
  const { field, civic } = useFieldConditions();
  const [userSubmissions, setUserSubmissions] = useState<PeerSubmission[]>([]);
  const [localQuests, setLocalQuests] = useState<GeneratedBankQuest[]>([]);
  const [questSource, setQuestSource] = useState<string | null>(null);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("");
  const [hit, setHit] = useState<VerifyHitPayload | null>(null);
  const seenVerified = useRef<Set<string> | null>(null);
  const lastLevel = useRef<number | null>(null);

  const todayStr = useMemo(() => formatLocalDate(), []);
  const weatherMood = field?.mood || "unknown";

  useEffect(() => {
    if (!field?.place || field.mood === "unknown") return;
    let cancelled = false;
    const params = new URLSearchParams({
      place: field.place,
      date: todayStr,
      mood: field.mood,
      weather: field.weatherLabel,
      air: field.airLabel,
    });
    fetch(`/api/quests/generate?${params}`)
      .then((r) => r.json())
      .then((data: { quests?: GeneratedBankQuest[]; source?: string }) => {
        if (cancelled) return;
        const quests = data.quests || [];
        setLocalQuests(quests);
        setQuestSource(data.source || null);
        if (quests.length > 0) {
          persistGeneratedQuests(todayStr, field.place!, quests);
        }
      })
      .catch(() => {
        if (!cancelled) setLocalQuests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [field?.place, field?.mood, field?.weatherLabel, field?.airLabel, todayStr]);

  const baseQuests = useMemo(() => {
    return getDailyQuestsForGuild(
      todayStr,
      profile?.guildId || "DEFAULT",
      weatherMood,
      localQuests,
    );
  }, [todayStr, profile?.guildId, weatherMood, localQuests]);

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
      <VerifyHit hit={hit} onDone={() => setHit(null)} />

      <div className="p-5 pb-5 rounded-2xl border border-border-subtle bg-canvas-card overflow-visible">
        <h2 className="text-sm font-medium text-ink-secondary mb-2">
          Your attributes
        </h2>
        <AttributeAmoeba attributes={profile.attributes} />
        <p className="text-xs text-ink-muted mt-2 text-center">
          N Neighborhood · E Energy · S Social · W Wisdom
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          Today ({verifiedCount}/3)
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Resets in {timeUntilMidnight || "…"}
        </p>
      </div>

      {field && field.mood !== "unknown" && (
        <div className="p-4 rounded-2xl border border-border-subtle bg-canvas-card space-y-2">
          <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide">
            Field conditions
          </p>
          {field.place && (
            <p className="text-sm font-medium text-ink-primary">{field.place}</p>
          )}
          <p className="text-xs text-ink-secondary leading-relaxed">
            {field.weatherLabel}
            {" · "}
            {field.airLabel}
            {field.daylightHint ? ` · ${field.daylightHint}` : ""}
          </p>
          <p className="text-xs text-attribute-energy">
            {weatherHint(field.mood, field.airBand)}
          </p>
          {localQuests.length > 0 && (
            <p className="text-xs text-ink-muted">
              Local quest bank · Gemini
              {questSource === "cache" ? " (cached)" : ""}
            </p>
          )}
          {civic && (
            <p className="text-xs text-ink-muted pt-1 border-t border-border-subtle">
              Your area · {civic.name}
              {civic.district ? ` · Dist. ${civic.district}` : ""}
              {civic.party ? ` (${civic.party})` : ""}
            </p>
          )}
        </div>
      )}

      {field && field.mood === "unknown" && (
        <p className="text-xs text-ink-muted -mt-2">
          Allow location for live weather, air quality, and local civic context.
        </p>
      )}

      <div className="space-y-3">
        {questsWithStatus.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>

      <Link
        href="/guild"
        className="block p-4 rounded-2xl border border-border-subtle bg-canvas-card"
      >
        <p className="text-sm font-medium text-ink-primary">
          Help others · +{VOUCH_BONUS_XP} Social
        </p>
        <p className="text-xs text-ink-muted mt-1">
          Vouch a guildmate&apos;s proof. You get XP too.
        </p>
      </Link>

      {profile.totalVerifiedDeeds > 0 && (
        <StreakCalendar
          streakDays={profile.streakDays}
          activeDates={profile.activeDates}
          lastActiveDate={profile.lastActiveDate}
        />
      )}
    </div>
  );
}
