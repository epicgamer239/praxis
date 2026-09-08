// src/lib/progression.ts

/** Local YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function formatLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday 00:00 local time for the week containing `date`. */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getTitleForLevel(level: number): string {
  if (level >= 10) return `Level ${level} Legendary Citizen`;
  if (level >= 7) return `Level ${level} Community Champion`;
  if (level >= 5) return `Level ${level} Real-World Adventurer`;
  if (level >= 3) return `Level ${level} Field Operative`;
  if (level >= 2) return `Level ${level} Apprentice`;
  return `Level ${level} Novice`;
}

export const VOUCH_BONUS_XP = 5;

export function applyAttributeXp<
  T extends Record<string, { level: number; currentXp: number; maxXp: number; verifiedCount?: number }>,
>(attributes: T, key: keyof T & string, amount: number, bumpVerified = false) {
  const attr = attributes[key];
  let xp = attr.currentXp + amount;
  let level = attr.level;
  while (xp >= attr.maxXp) {
    xp -= attr.maxXp;
    level += 1;
  }
  const next = {
    ...attributes,
    [key]: {
      ...attr,
      currentXp: xp,
      level,
      verifiedCount: (attr.verifiedCount || 0) + (bumpVerified ? 1 : 0),
    },
  };
  const overallLevel = computeOverallLevelFromAttributes(next);
  return {
    attributes: next,
    overallLevel,
    title: getTitleForLevel(overallLevel),
  };
}

/** Overall character level from attribute XP pools (100 XP per level). */
export function computeOverallLevelFromAttributes(
  attributes: Record<
    string,
    { level: number; currentXp: number; maxXp?: number }
  >,
): number {
  const totalXp = Object.values(attributes).reduce(
    (sum, attr) => sum + (attr.level - 1) * 100 + attr.currentXp,
    0,
  );
  return Math.max(1, Math.floor(totalXp / 100) + 1);
}

export interface CalendarDay {
  dateStr: string;
  label: string; // Mon, Tue, ...
  dayOfMonth: number;
  isToday: boolean;
  isActive: boolean;
  isFuture: boolean;
}

/** Current week Mon–Sun with activity flags. */
export function buildWeekCalendar(activeDates: Set<string>): CalendarDay[] {
  const today = formatLocalDate();
  const weekStart = getWeekStart();
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return labels.map((label, idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    const dateStr = formatLocalDate(d);
    return {
      dateStr,
      label,
      dayOfMonth: d.getDate(),
      isToday: dateStr === today,
      isActive: activeDates.has(dateStr),
      isFuture: dateStr > today,
    };
  });
}

/** Prefer stored activeDates; approximate from streak for older profiles. */
export function resolveActiveDates(profile: {
  activeDates?: string[];
  lastActiveDate?: string;
  streakDays?: number;
}): Set<string> {
  const set = new Set(profile.activeDates || []);
  if (set.size === 0 && profile.lastActiveDate && (profile.streakDays || 0) > 0) {
    const end = parseLocalDate(profile.lastActiveDate);
    for (let i = 0; i < (profile.streakDays || 0); i++) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      set.add(formatLocalDate(d));
    }
  }
  return set;
}
