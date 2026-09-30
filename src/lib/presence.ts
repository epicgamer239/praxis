// src/lib/presence.ts

/** Consider online if heartbeat within this window. */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

/** How often the open app writes lastSeenAt. */
export const HEARTBEAT_MS = 45 * 1000;

export function toMillis(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "object") {
    const obj = raw as {
      toMillis?: () => number;
      seconds?: number;
    };
    if (typeof obj.toMillis === "function") return obj.toMillis();
    if (typeof obj.seconds === "number") return obj.seconds * 1000;
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function isOnline(
  lastSeenAtMs: number | null,
  now = Date.now(),
): boolean {
  return lastSeenAtMs != null && now - lastSeenAtMs < ONLINE_WINDOW_MS;
}

export function formatPresence(
  lastSeenAtMs: number | null,
  now = Date.now(),
): string {
  if (lastSeenAtMs == null) return "Offline";
  if (isOnline(lastSeenAtMs, now)) return "Online";

  const diff = Math.max(0, now - lastSeenAtMs);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return "Offline";
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (name.trim().slice(0, 2) || "?").toUpperCase();
}

const AVATAR_TONES = [
  "bg-attribute-neighborhood/25 text-attribute-neighborhood",
  "bg-attribute-energy/25 text-attribute-energy",
  "bg-attribute-social/25 text-attribute-social",
  "bg-attribute-wisdom/25 text-attribute-wisdom",
];

export function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}
