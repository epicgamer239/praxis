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
    <div className="py-1 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-ink-secondary">Streak</h3>
        <p className="text-sm font-semibold text-ink-primary tabular-nums">
          {streakDays}-day
          <span className="text-xs font-medium text-ink-muted"> active</span>
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={cn(
              "py-2.5 border-b-2",
              day.isToday
                ? "border-moss streak-today"
                : day.isActive
                  ? "border-attribute-energy/50"
                  : "border-border-subtle",
              day.isFuture && "opacity-40",
            )}
          >
            <p className="text-[10px] text-ink-muted mb-1">{day.label}</p>
            <p
              className={cn(
                "text-xs font-medium",
                day.isActive ? "text-attribute-energy" : "text-ink-muted",
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
    </div>
  );
}
