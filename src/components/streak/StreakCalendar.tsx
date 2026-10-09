// src/components/streak/StreakCalendar.tsx
"use client";

import React, { useMemo } from "react";
import { buildWeekCalendar, resolveActiveDates } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

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
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink-secondary">Streak</h3>
        <div className="flex items-center gap-1.5">
          <Flame
            size={14}
            className={cn(
              "shrink-0",
              streakDays > 0 ? "text-amber-400" : "text-ink-muted",
            )}
          />
          <p className="text-sm font-semibold text-ink-primary tabular-nums">
            {streakDays}-day
            <span className="text-xs font-medium text-ink-muted"> active</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={cn(
              "rounded-xl py-2.5 transition-colors",
              day.isToday
                ? "bg-moss/20 ring-1 ring-moss/40"
                : day.isActive
                  ? "bg-white/[0.03]"
                  : "bg-transparent",
              day.isFuture && "opacity-30",
            )}
          >
            <p className="text-[10px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              {day.label}
            </p>
            <div className="flex items-center justify-center h-5">
              {day.isFuture ? (
                <span className="block w-1 h-1 rounded-full bg-gray-600" />
              ) : day.isActive ? (
                <span className="block w-2.5 h-2.5 rounded-full bg-attribute-energy shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
              ) : (
                <span className="block w-2.5 h-2.5 rounded-full border border-gray-600/60" />
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 tabular-nums font-medium">
              {day.dayOfMonth}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
