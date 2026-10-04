// src/components/compass/CompassInstrument.tsx
"use client";

import React, { useMemo } from "react";
import { UserProfile } from "@/types";

interface CompassInstrumentProps {
  attributes: UserProfile["attributes"];
  level: number;
  streakDays: number;
}

function effRadius(
  stat: { level: number; currentXp: number; maxXp: number },
  minR: number,
  maxR: number,
) {
  const fraction = stat.maxXp > 0 ? stat.currentXp / stat.maxXp : 0;
  const eff = Math.max(0, stat.level - 1 + fraction);
  // Soft curve so early levels still read clearly
  const t = Math.min(1, eff / 5);
  return minR + t * (maxR - minR);
}

export default function CompassInstrument({
  attributes,
  level,
  streakDays,
}: CompassInstrumentProps) {
  const geometry = useMemo(() => {
    const cx = 160;
    const cy = 160;
    const outerR = 138;
    const minR = 36;
    const maxR = 108;

    const rN = effRadius(attributes.neighborhood, minR, maxR);
    const rE = effRadius(attributes.energy, minR, maxR);
    const rS = effRadius(attributes.social, minR, maxR);
    const rW = effRadius(attributes.wisdom, minR, maxR);

    // Soft diamond hull toward cardinals
    const tension = 0.22;
    const n = { x: cx, y: cy - rN };
    const e = { x: cx + rE, y: cy };
    const s = { x: cx, y: cy + rS };
    const w = { x: cx - rW, y: cy };

    const hull = [
      `M ${n.x} ${n.y}`,
      `C ${n.x + rE * tension} ${n.y}, ${e.x} ${e.y - rN * tension}, ${e.x} ${e.y}`,
      `C ${e.x} ${e.y + rS * tension}, ${s.x + rE * tension} ${s.y}, ${s.x} ${s.y}`,
      `C ${s.x - rW * tension} ${s.y}, ${w.x} ${w.y + rS * tension}, ${w.x} ${w.y}`,
      `C ${w.x} ${w.y - rN * tension}, ${n.x - rW * tension} ${n.y}, ${n.x} ${n.y}`,
      "Z",
    ].join(" ");

    const ticks: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] =
      [];
    for (let deg = 0; deg < 360; deg += 6) {
      const rad = ((deg - 90) * Math.PI) / 180;
      const major = deg % 30 === 0;
      const inner = outerR - (major ? 10 : 5);
      ticks.push({
        x1: cx + Math.cos(rad) * inner,
        y1: cy + Math.sin(rad) * inner,
        x2: cx + Math.cos(rad) * outerR,
        y2: cy + Math.sin(rad) * outerR,
        major,
      });
    }

    return { cx, cy, outerR, hull, ticks, rN, rE, rS, rW };
  }, [attributes]);

  const { cx, cy, outerR, hull, ticks } = geometry;

  return (
    <div className="w-full select-none" style={{ height: "min(42vh, 360px)" }}>
      <svg
        viewBox="0 -4 320 328"
        className="w-full h-full"
        role="img"
        aria-label={`Compass · Level ${level} · ${streakDays}-day streak`}
      >
        <defs>
          <radialGradient id="compassHub" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#222624" />
            <stop offset="100%" stopColor="#181A18" />
          </radialGradient>
          <linearGradient id="hullFill" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FACC15" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#4ADE80" stopOpacity="0.4" />
            <stop offset="65%" stopColor="#FB923C" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.5" />
          </linearGradient>
          <filter id="hullGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Bezel */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="#262A27"
          strokeWidth="1.5"
        />
        <circle
          cx={cx}
          cy={cy}
          r={outerR - 14}
          fill="none"
          stroke="#262A27"
          strokeWidth="0.75"
          opacity="0.7"
        />

        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? "#3A423D" : "#262A27"}
            strokeWidth={t.major ? 1.4 : 0.8}
          />
        ))}

        {/* Axis guides */}
        <line
          x1={cx}
          y1={cy - outerR + 18}
          x2={cx}
          y2={cy + outerR - 18}
          stroke="#262A27"
          strokeWidth="0.8"
        />
        <line
          x1={cx - outerR + 18}
          y1={cy}
          x2={cx + outerR - 18}
          y2={cy}
          stroke="#262A27"
          strokeWidth="0.8"
        />

        {/* Magnetic hull */}
        <path
          d={hull}
          fill="url(#hullFill)"
          stroke="#3A423D"
          strokeWidth="1.25"
          filter="url(#hullGlow)"
          opacity="0.95"
        />

        {/* Cardinal labels */}
        <text
          x={cx}
          y={22}
          textAnchor="middle"
          fill="#FACC15"
          fontSize="13"
          fontWeight="700"
        >
          N
        </text>
        <text
          x={cx}
          y={36}
          textAnchor="middle"
          fill="#FACC15"
          fontSize="9"
          fontWeight="500"
          opacity="0.9"
        >
          Neighborhood
        </text>

        <text
          x={302}
          y={cy - 4}
          textAnchor="end"
          fill="#4ADE80"
          fontSize="13"
          fontWeight="700"
        >
          E
        </text>
        <text
          x={302}
          y={cy + 10}
          textAnchor="end"
          fill="#4ADE80"
          fontSize="9"
          fontWeight="500"
          opacity="0.9"
        >
          Energy
        </text>

        <text
          x={cx}
          y={302}
          textAnchor="middle"
          fill="#FB923C"
          fontSize="13"
          fontWeight="700"
        >
          S
        </text>
        <text
          x={cx}
          y={314}
          textAnchor="middle"
          fill="#FB923C"
          fontSize="9"
          fontWeight="500"
          opacity="0.9"
        >
          Social
        </text>

        <text
          x={18}
          y={cy - 4}
          textAnchor="start"
          fill="#38BDF8"
          fontSize="13"
          fontWeight="700"
        >
          W
        </text>
        <text
          x={18}
          y={cy + 10}
          textAnchor="start"
          fill="#38BDF8"
          fontSize="9"
          fontWeight="500"
          opacity="0.9"
        >
          Wisdom
        </text>

        {/* Center hub */}
        <circle
          cx={cx}
          cy={cy}
          r={34}
          fill="url(#compassHub)"
          stroke="#262A27"
          strokeWidth="1.25"
        />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill="#F0EFEA"
          fontSize="15"
          fontWeight="700"
          className="tabular-nums"
        >
          Lv {level}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="#9EA7A0"
          fontSize="10"
          fontWeight="500"
          className="tabular-nums"
        >
          {streakDays}d streak
        </text>
      </svg>
    </div>
  );
}
