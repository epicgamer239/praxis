"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  subscribeToGuildSubmissions,
  subscribeToGuild,
  subscribeToGuildMembers,
  vouchForSubmission,
  sendNudgeToMember,
} from "@/lib/firestoreService";
import { PeerSubmission, Guild, LeaderboardEntry } from "@/types";
import { getWeekStart } from "@/lib/progression";
import GuildGate from "@/components/guild/GuildGate";

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
  const [allTimeBoard, setAllTimeBoard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<"weekly" | "all-time">(
    "weekly",
  );

  const [inspectedPhoto, setInspectedPhoto] = useState<{
    url: string;
    title: string;
    author: string;
  } | null>(null);

  useEffect(() => {
    if (!profile?.guildId) return;

    const unsubGuild = subscribeToGuild(profile.guildId, (data) => {
      setGuild(data);
    });

    const unsubSubs = subscribeToGuildSubmissions(profile.guildId, (data) => {
      setSubmissions(data);
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
        setAllTimeBoard(list);
      },
    );
    return () => unsubMembers();
  }, [guild?.memberIds, profile?.id]);

  const weeklyBoard: LeaderboardEntry[] = useMemo(() => {
    const weekStart = getWeekStart();
    const byUser = new Map<
      string,
      { name: string; deedsCount: number; totalXp: number }
    >();

    for (const entry of allTimeBoard) {
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
  }, [allTimeBoard, submissions, profile?.id]);

  const leaderboard =
    leaderboardTab === "weekly" ? weeklyBoard : allTimeBoard;

  if (!profile || !profile.guildId) {
    return <GuildGate />;
  }

  const displayCode = guild?.inviteCode || profile.guildId;

  const handleCopyCode = async () => {
    if (!displayCode) return;
    try {
      await navigator.clipboard.writeText(displayCode);
      toast("Invite code copied to clipboard!");
    } catch {
      toast("Failed to copy invite code.");
    }
  };

  const handleVouch = async (sub: PeerSubmission) => {
    try {
      await vouchForSubmission(sub.id, profile.id, profile.name);
      toast(`Vouched for ${sub.authorName}'s deed.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cannot vouch.";
      toast(message);
    }
  };

  const handleNudge = async (targetUserId: string, targetName: string) => {
    try {
      await sendNudgeToMember(targetUserId, profile.name);
      toast(`Nudged ${targetName} to step outside today!`);
    } catch {
      toast("Failed to send nudge.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border-subtle">
        <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
          Guild
        </h2>
        <button
          type="button"
          onClick={handleCopyCode}
          title="Click to copy invite code"
          className="text-xs text-ink-muted hover:text-ink-primary transition-colors flex items-center space-x-1.5 self-start"
        >
          <span>Invite Code:</span>
          <span className="font-semibold text-attribute-civic underline underline-offset-2">
            {displayCode}
          </span>
          <span className="text-[10px] text-ink-muted">(Copy)</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <h3 className="text-sm font-medium text-ink-secondary">
            Peer Verification Queue
          </h3>

          {submissions.length === 0 ? (
            <div className="p-8 rounded-2xl border border-border-subtle bg-canvas-card text-center text-sm text-ink-muted">
              No submissions currently awaiting vouches in {profile.guildName}.
            </div>
          ) : (
            submissions.map((sub) => {
              const isAuthor = sub.userId === profile.id;
              const hasVouched = sub.vouchedBy.includes(profile.id);
              const isVerified = sub.status === "verified";

              return (
                <div
                  key={sub.id}
                  className="p-5 rounded-2xl border border-border-subtle bg-canvas-card space-y-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-primary font-medium">
                      {sub.authorName} {isAuthor && "(You)"}
                    </span>
                    <span className="text-attribute-social font-medium">
                      {sub.attributeLabel} · +{sub.xpReward} XP
                    </span>
                  </div>

                  <p className="text-base font-medium text-ink-primary">
                    {sub.questTitle}
                  </p>

                  <div
                    onClick={() =>
                      sub.photoBase64 &&
                      setInspectedPhoto({
                        url: sub.photoBase64,
                        title: sub.questTitle,
                        author: sub.authorName,
                      })
                    }
                    className="w-full h-56 rounded-xl overflow-hidden border border-border-subtle bg-canvas-subtle cursor-pointer relative group"
                    title="Click to inspect photo"
                  >
                    <img
                      src={sub.photoBase64}
                      alt="Submission proof"
                      className="w-full h-full object-cover transition-transform group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs bg-canvas-card/90 text-ink-primary px-3 py-1.5 rounded-xl border border-border-subtle">
                        Click to enlarge
                      </span>
                    </div>
                  </div>

                  {sub.fieldNote && (
                    <p className="text-xs text-ink-secondary italic">
                      &ldquo;{sub.fieldNote}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle gap-2">
                    <span className="text-xs text-ink-muted">
                      Status: {sub.vouchesReceived} of {sub.requiredVouches}{" "}
                      vouches
                      {sub.vouchedByNames.length > 0 &&
                        ` (by ${sub.vouchedByNames.join(", ")})`}
                    </span>

                    {isAuthor ? (
                      <span className="text-xs text-ink-muted italic shrink-0">
                        Your submission
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={hasVouched || isVerified}
                        onClick={() => handleVouch(sub)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-ink-primary bg-moss hover:bg-moss-hover disabled:bg-canvas-subtle disabled:text-ink-muted transition-colors shrink-0"
                      >
                        {isVerified
                          ? "✓ Verified"
                          : hasVouched
                            ? "Vouched"
                            : "Vouch"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="col-span-12 lg:col-span-5 p-5 sm:p-6 rounded-2xl border border-border-subtle bg-canvas-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-ink-secondary">
              Guild Standings
            </h3>
            <div className="flex space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setLeaderboardTab("weekly")}
                className={`px-2 py-1 rounded transition-colors ${
                  leaderboardTab === "weekly"
                    ? "text-ink-primary font-medium bg-canvas-subtle"
                    : "text-ink-muted hover:text-ink-secondary"
                }`}
              >
                This week
              </button>
              <span className="text-ink-muted">·</span>
              <button
                type="button"
                onClick={() => setLeaderboardTab("all-time")}
                className={`px-2 py-1 rounded transition-colors ${
                  leaderboardTab === "all-time"
                    ? "text-ink-primary font-medium bg-canvas-subtle"
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

                    {!entry.isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => handleNudge(entry.userId, entry.name)}
                        className="text-xs text-attribute-social hover:underline ml-1"
                      >
                        Nudge
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {inspectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 sm:p-6 animate-in fade-in"
          onClick={() => setInspectedPhoto(null)}
        >
          <div
            className="max-w-2xl w-full bg-canvas-card border border-border-strong rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-xs pb-2 border-b border-border-subtle">
              <div>
                <p className="text-ink-primary font-medium">
                  {inspectedPhoto.author}&apos;s proof photo
                </p>
                <p className="text-ink-secondary mt-0.5">
                  {inspectedPhoto.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPhoto(null)}
                className="text-xs text-ink-muted hover:text-ink-primary px-2.5 py-1 rounded-xl bg-canvas-subtle transition-colors"
              >
                Close (✕)
              </button>
            </div>
            <div className="max-h-[72vh] overflow-hidden rounded-xl bg-canvas-subtle flex items-center justify-center">
              <img
                src={inspectedPhoto.url}
                alt="Enlarged proof"
                className="w-full h-auto max-h-[72vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
