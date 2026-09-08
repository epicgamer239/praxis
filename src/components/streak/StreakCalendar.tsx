// src/components/streak/StreakCalendar.tsx
"use client";

import React, { useMemo } from "react";
import { buildWeekCalendar, resolveActiveDates } from "@/lib/progression";
import { cn } from "@/lib/utils";

interface StreakCalendarProps {
  streakDays: number;
  activeDates?: string[];
  lastActiveDate?: string;
}

export default function StreakCalendar({
  streakDays,
  activeDates,
  lastActiveDate,
}: StreakCalendarProps) {
  const days = useMemo(() => {
    const set = resolveActiveDates({
      activeDates,
      lastActiveDate,
      streakDays,
    });
    return buildWeekCalendar(set);
  }, [activeDates, lastActiveDate, streakDays]);

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-border-subtle bg-canvas-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-ink-secondary">
          Consistency Streak
        </h3>
        <span className="text-xs text-attribute-vitality font-medium">
          {streakDays}-day active
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={cn(
              "p-2 sm:p-2.5 rounded-xl border",
              day.isToday
                ? "border-moss bg-canvas-subtle streak-today"
                : "border-border-subtle bg-canvas-subtle",
              day.isFuture && "opacity-40",
            )}
          >
            <p className="text-[10px] sm:text-[11px] text-ink-muted mb-1">
              {day.label}
            </p>
            <p
              className={cn(
                "text-xs font-medium",
                day.isActive ? "text-attribute-vitality" : "text-ink-muted",
              )}
            >
              {day.isFuture ? "·" : day.isActive ? "✓" : "○"}
            </p>
            <p className="text-[9px] text-ink-muted mt-0.5 tabular-nums">
              {day.dayOfMonth}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ink-muted mt-3 leading-relaxed">
        Days light up when a deed is verified by your guild. Miss a day and the
        streak resets.
      </p>
    </div>
  );
}
