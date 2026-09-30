// src/lib/attributes.ts
import { AttributeStat, AttributeType, UserProfile } from "@/types";
import { xpToNextLevel } from "@/lib/progression";

const EMPTY: AttributeStat = {
  level: 1,
  currentXp: 0,
  maxXp: 100,
  verifiedCount: 0,
};

function asStat(raw: unknown): AttributeStat {
  if (!raw || typeof raw !== "object") return { ...EMPTY, maxXp: xpToNextLevel(1) };
  const s = raw as Partial<AttributeStat>;
  const level = typeof s.level === "number" ? s.level : 1;
  return {
    level,
    currentXp: typeof s.currentXp === "number" ? s.currentXp : 0,
    maxXp: typeof s.maxXp === "number" ? s.maxXp : xpToNextLevel(level),
    verifiedCount: typeof s.verifiedCount === "number" ? s.verifiedCount : 0,
  };
}

/** Map legacy civic/vitality schemas onto the compass keys. */
export function normalizeAttributes(
  raw: Record<string, unknown> | UserProfile["attributes"] | null | undefined,
): UserProfile["attributes"] {
  const src = (raw || {}) as Record<string, unknown>;
  return {
    neighborhood: asStat(src.neighborhood ?? src.civic),
    energy: asStat(src.energy ?? src.vitality),
    social: asStat(src.social),
    wisdom: asStat(src.wisdom),
  };
}

export function defaultAttributes(): UserProfile["attributes"] {
  const base = { ...EMPTY, maxXp: xpToNextLevel(1) };
  return {
    neighborhood: { ...base },
    energy: { ...base },
    social: { ...base },
    wisdom: { ...base },
  };
}

export function normalizeAttributeKey(raw: string | undefined): AttributeType {
  if (raw === "civic") return "neighborhood";
  if (raw === "vitality") return "energy";
  if (
    raw === "neighborhood" ||
    raw === "energy" ||
    raw === "social" ||
    raw === "wisdom"
  ) {
    return raw;
  }
  return "social";
}

export function attributesNeedRewrite(
  raw: Record<string, unknown> | null | undefined,
): boolean {
  if (!raw) return true;
  return (
    "civic" in raw ||
    "vitality" in raw ||
    !("neighborhood" in raw) ||
    !("energy" in raw)
  );
}
