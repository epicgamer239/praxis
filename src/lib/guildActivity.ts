// src/lib/guildActivity.ts
import { GuildActivityItem, PeerSubmission } from "@/types";
import { toMillis } from "@/lib/presence";

export function countPendingVouchesForYou(
  submissions: PeerSubmission[],
  userId: string,
): number {
  return submissions.filter(
    (s) =>
      s.status === "awaiting_vouches" &&
      s.userId !== userId &&
      !s.vouchedBy.includes(userId),
  ).length;
}

export function pendingProofsByUser(
  submissions: PeerSubmission[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of submissions) {
    if (s.status !== "awaiting_vouches") continue;
    map.set(s.userId, (map.get(s.userId) || 0) + 1);
  }
  return map;
}

export function needsYourVouchByUser(
  submissions: PeerSubmission[],
  currentUserId: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of submissions) {
    if (s.status !== "awaiting_vouches") continue;
    if (s.userId === currentUserId) continue;
    if (s.vouchedBy.includes(currentUserId)) continue;
    map.set(s.userId, (map.get(s.userId) || 0) + 1);
  }
  return map;
}

/** Build a short live ticker from guild submissions. */
export function buildGuildActivity(
  submissions: PeerSubmission[],
  limit = 12,
): GuildActivityItem[] {
  const items: GuildActivityItem[] = [];

  for (const sub of submissions) {
    if (sub.status === "verified") {
      const atMs =
        toMillis(sub.verifiedAt) || toMillis(sub.createdAt) || 0;
      items.push({
        id: `verified-${sub.id}`,
        atMs,
        kind: "verified",
        text: `${sub.authorName} locked in “${shortTitle(sub.questTitle)}” · ${sub.attributeLabel}`,
        href: "/guild",
      });
    } else {
      const atMs = toMillis(sub.createdAt) || 0;
      const left = Math.max(
        0,
        (sub.requiredVouches || 2) - (sub.vouchesReceived || 0),
      ); // default 2 matches BASE_REQUIRED_VOUCHES
      items.push({
        id: `submitted-${sub.id}`,
        atMs,
        kind: "submitted",
        text: `${sub.authorName} · “${shortTitle(sub.questTitle)}” · ${left} left`,
        href: "/verify",
      });
    }
  }

  items.sort((a, b) => b.atMs - a.atMs);
  return items.slice(0, limit);
}

function shortTitle(title: string): string {
  if (title.length <= 42) return title;
  return `${title.slice(0, 40)}…`;
}

export function formatActivityTime(atMs: number, now = Date.now()): string {
  if (!atMs) return "";
  const diff = Math.max(0, now - atMs);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
