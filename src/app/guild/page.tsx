"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeToGuildSubmissions,
  subscribeToGuild,
  subscribeToGuildMembers,
  membersToLeaderboard,
  reconcileGuildVerifications,
  leaveGuild,
} from "@/lib/firestoreService";
import { useToast } from "@/context/ToastContext";
import {
  PeerSubmission,
  Guild,
  LeaderboardEntry,
  GuildMemberProfile,
} from "@/types";
import { getWeekStart } from "@/lib/progression";
import GuildGate from "@/components/guild/GuildGate";
import MemberAvatar from "@/components/guild/MemberAvatar";
import {
  needsYourVouchByUser,
  pendingProofsByUser,
} from "@/lib/guildActivity";
import { formatPresence } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { Users, Flame, Hash } from "lucide-react";

function submissionDate(sub: PeerSubmission): Date | null {
  const raw = (sub.verifiedAt || sub.createdAt) as {
    toDate?: () => Date;
    seconds?: number;
  } | Date | string | null;
  if (!raw) return null;
  if (typeof raw === "object" && "toDate" in raw && typeof raw.toDate === "function") {
    return raw.toDate();
  }
  if (raw instanceof Date) return raw;
  if (typeof raw === "object" && typeof raw.seconds === "number") {
    return new Date(raw.seconds * 1000);
  }
  const parsed = new Date(raw as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function GuildPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [submissions, setSubmissions] = useState<PeerSubmission[]>([]);
  const [members, setMembers] = useState<GuildMemberProfile[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<"weekly" | "all-time">(
    "weekly",
  );
  const [, setTick] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  useEffect(() => {
    if (!profile?.guildId) return;

    const unsubGuild = subscribeToGuild(profile.guildId, (data) => {
      setGuild(data);
    });

    const unsubSubs = subscribeToGuildSubmissions(profile.guildId, (data) => {
      setSubmissions(data);
    });

    void reconcileGuildVerifications(profile.guildId).catch(() => {
      /* best-effort */
    });

    return () => {
      unsubGuild();
      unsubSubs();
    };
  }, [profile?.guildId]);

  useEffect(() => {
    if (!guild?.memberIds || !profile?.id) return;
    const unsubMembers = subscribeToGuildMembers(
      guild.memberIds,
      profile.id,
      (list) => {
        setMembers(list);
      },
    );
    return () => unsubMembers();
  }, [guild?.memberIds, profile?.id]);

  // Refresh relative "Online / 5m ago" labels
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const allTimeBoard: LeaderboardEntry[] = useMemo(
    () => membersToLeaderboard(members),
    [members],
  );

  const weeklyBoard: LeaderboardEntry[] = useMemo(() => {
    const weekStart = getWeekStart();
    const byUser = new Map<
      string,
      { name: string; deedsCount: number; totalXp: number }
    >();

    for (const entry of members) {
      byUser.set(entry.userId, {
        name: entry.name,
        deedsCount: 0,
        totalXp: 0,
      });
    }

    for (const sub of submissions) {
      if (sub.status !== "verified") continue;
      const created = submissionDate(sub);
      if (!created || created < weekStart) continue;

      const existing = byUser.get(sub.userId) || {
        name: sub.authorName,
        deedsCount: 0,
        totalXp: 0,
      };
      existing.deedsCount += 1;
      existing.totalXp += sub.xpReward;
      if (!existing.name) existing.name = sub.authorName;
      byUser.set(sub.userId, existing);
    }

    const list: LeaderboardEntry[] = Array.from(byUser.entries()).map(
      ([userId, stats]) => ({
        rank: 0,
        userId,
        name: stats.name,
        isCurrentUser: userId === profile?.id,
        deedsCount: stats.deedsCount,
        totalXp: stats.totalXp,
      }),
    );

    list.sort((a, b) => b.deedsCount - a.deedsCount || b.totalXp - a.totalXp);
    list.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    return list;
  }, [members, submissions, profile?.id]);

  const leaderboard =
    leaderboardTab === "weekly" ? weeklyBoard : allTimeBoard;

  const pendingByUser = useMemo(
    () => pendingProofsByUser(submissions),
    [submissions],
  );
  const needsYouByUser = useMemo(
    () =>
      profile?.id
        ? needsYourVouchByUser(submissions, profile.id)
        : new Map<string, number>(),
    [submissions, profile?.id],
  );

  const weekDeeds = useMemo(() => {
    const weekStart = getWeekStart();
    return submissions.filter((s) => {
      if (s.status !== "verified") return false;
      const d = submissionDate(s);
      return d !== null && d >= weekStart;
    }).length;
  }, [submissions]);

  const weekGoal = Math.max((members.length || 1) * 3, 6);

  const roster = useMemo(() => {
    return [...members].sort((a, b) => {
      const aNeed = needsYouByUser.get(a.userId) || 0;
      const bNeed = needsYouByUser.get(b.userId) || 0;
      if (bNeed !== aNeed) return bNeed - aNeed;
      return b.totalVerifiedDeeds - a.totalVerifiedDeeds;
    });
  }, [members, needsYouByUser]);

  if (!profile || !profile.guildId) {
    return <GuildGate />;
  }

  const inviteCode = guild?.inviteCode;

  const handleConfirmLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await leaveGuild(profile.id);
      toast("Left guild. Progress saved.");
      setLeaveModalOpen(false);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Could not leave guild.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="space-y-6 min-h-full">
      <div className="pb-4 border-b border-border-subtle">
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          {guild?.name || profile.guildName}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
            <Users size={14} className="shrink-0 text-gray-400" />
            <span>{members.length} member{members.length === 1 ? "" : "s"}</span>
          </span>

          <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
            <Flame size={14} className="shrink-0 text-amber-400" />
            <span>{weekDeeds}/{weekGoal} deeds this week</span>
          </span>

          {inviteCode && (
            <span className="rounded-md bg-white/5 text-gray-300 px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5">
              <Hash size={14} className="shrink-0 text-green-400" />
              <span>{inviteCode}</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-ink-secondary">Roster</h3>
          <div className="h-1.5 flex-1 max-w-[9rem] rounded-full bg-canvas-subtle overflow-hidden ml-3">
            <div
              className="h-full rounded-full bg-attribute-neighborhood transition-[width] duration-500"
              style={{
                width: `${Math.min(100, (weekDeeds / weekGoal) * 100)}%`,
              }}
            />
          </div>
        </div>

        {roster.length === 0 ? (
          <p className="text-sm text-ink-muted">Loading members…</p>
        ) : (
          <div className="space-y-3">
            {roster.map((member) => {
              const pending = pendingByUser.get(member.userId) || 0;
              const needsYou = needsYouByUser.get(member.userId) || 0;
              const presence = formatPresence(member.lastSeenAtMs);

              return (
                <div
                  key={member.userId}
                  className={cn(
                    "pl-3 py-3 border-l-4",
                    member.isCurrentUser
                      ? "border-l-moss"
                      : "border-l-border-subtle",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <MemberAvatar
                      name={member.name}
                      userId={member.userId}
                      lastSeenAtMs={member.lastSeenAtMs}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-primary truncate">
                            {member.name}
                            {member.isCurrentUser ? " (You)" : ""}
                          </p>
                          <p className="text-xs text-ink-muted mt-0.5 truncate">
                            {member.title}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-xs shrink-0 font-medium",
                            presence === "Online"
                              ? "text-attribute-energy"
                              : "text-ink-muted",
                          )}
                        >
                          {presence}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-secondary">
                        <span>{member.streakDays}d streak</span>
                        <span>{member.totalVerifiedDeeds} deeds</span>
                        <span>{member.totalVouchesGiven} vouches</span>
                      </div>

                      {pending > 0 && (
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <p className="text-xs text-attribute-neighborhood">
                            {pending} awaiting verify
                            {needsYou > 0 ? ` · ${needsYou} need you` : ""}
                          </p>
                          {needsYou > 0 && (
                            <Link
                              href="/verify"
                              className="text-xs font-semibold text-ink-primary underline underline-offset-2"
                            >
                              Vouch
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-ink-secondary">
            Standings
          </h3>
          <div className="flex items-end gap-3 text-sm">
            <button
              type="button"
              onClick={() => setLeaderboardTab("weekly")}
              className={`pb-1 transition-colors ${
                leaderboardTab === "weekly"
                  ? "text-ink-primary font-medium underline underline-offset-[6px] decoration-ink-primary"
                  : "text-ink-muted hover:text-ink-secondary"
              }`}
            >
              This week
            </button>
            <span className="text-ink-muted pb-1">·</span>
            <button
              type="button"
              onClick={() => setLeaderboardTab("all-time")}
              className={`pb-1 transition-colors ${
                leaderboardTab === "all-time"
                  ? "text-ink-primary font-medium underline underline-offset-[6px] decoration-ink-primary"
                  : "text-ink-muted hover:text-ink-secondary"
              }`}
            >
              All-time
            </button>
          </div>
        </div>

        <p className="text-[11px] text-ink-muted -mt-2">
          {leaderboardTab === "weekly"
            ? "Verified deeds since Monday (local time)."
            : "Career totals across all verified deeds."}
        </p>

        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <p className="text-xs text-ink-muted">Loading members...</p>
          ) : (
            leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-xl text-xs gap-2 ${
                  entry.isCurrentUser
                    ? "bg-canvas-subtle text-ink-primary font-medium"
                    : "text-ink-secondary"
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-ink-muted shrink-0">
                    {entry.rank}.
                  </span>
                  <span className="truncate">
                    {entry.name} {entry.isCurrentUser && "(You)"}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-ink-muted">
                    {entry.deedsCount} deeds · {entry.totalXp} XP
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => setLeaveModalOpen(true)}
          className="text-sm text-ink-muted hover:text-attribute-social transition-colors"
        >
          Leave guild
        </button>
      </div>

      {leaveModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !leaving && setLeaveModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-canvas-card border border-border-strong p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">
                Leave {guild?.name || "guild"}?
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Leaving clears your guild seat only. Level, attributes, streak, and
                verified deeds stay on your profile.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                disabled={leaving}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-ink-secondary bg-white/5 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmLeave()}
                disabled={leaving}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-red-600/80 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {leaving ? "Leaving…" : "Leave guild"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
