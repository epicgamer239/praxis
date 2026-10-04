// src/components/compass/CompassInstrument.tsx
"use client";

import React, { useId, useMemo, useState } from "react";
import { UserProfile } from "@/types";
import { useDeviceHeading } from "@/hooks/useDeviceHeading";
import {
  enableDeviceHeading,
  getDeviceHeading,
  isDeviceHeadingEnabled,
  requestHeadingPermission,
  wakeHeadingIfGranted,
} from "@/lib/deviceHeading";

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
  const t = Math.min(1, (0.22 + eff) / 5.2);
  return minR + t * (maxR - minR);
}

/** Bearing: 0 = north, clockwise. Screen y grows down. */
function polar(cx: number, cy: number, r: number, bearingDeg: number) {
  const rad = (bearingDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

const CARDINALS = [
  {
    bearing: 0,
    letter: "N",
    word: "Neighborhood",
    color: "#FACC15",
    key: "neighborhood" as const,
  },
  {
    bearing: 90,
    letter: "E",
    word: "Energy",
    color: "#4ADE80",
    key: "energy" as const,
  },
  {
    bearing: 180,
    letter: "S",
    word: "Social",
    color: "#FB923C",
    key: "social" as const,
  },
  {
    bearing: 270,
    letter: "W",
    word: "Wisdom",
    color: "#38BDF8",
    key: "wisdom" as const,
  },
];

export default function CompassInstrument({
  attributes,
  level,
  streakDays,
}: CompassInstrumentProps) {
  const uid = useId().replace(/:/g, "");
  const heading = useDeviceHeading();
  const live = heading != null;
  const rotation = live ? -heading : 0;
  const [asking, setAsking] = useState(false);

  const geometry = useMemo(() => {
    const cx = 180;
    const cy = 180;
    const outerR = 132;
    const hubR = 40;
    const minR = hubR + 20;
    const maxR = 108;
    const wordR = outerR + 22;

    const radii = {
      neighborhood: effRadius(attributes.neighborhood, minR, maxR),
      energy: effRadius(attributes.energy, minR, maxR),
      social: effRadius(attributes.social, minR, maxR),
      wisdom: effRadius(attributes.wisdom, minR, maxR),
    };

    const petals = CARDINALS.map((c) => {
      const r = radii[c.key];
      const tip = polar(cx, cy, r, c.bearing);
      const left = polar(cx, cy, r * 0.58, c.bearing - 20);
      const right = polar(cx, cy, r * 0.58, c.bearing + 20);
      const base = polar(cx, cy, hubR + 2, c.bearing);
      const d = [
        `M ${base.x.toFixed(1)} ${base.y.toFixed(1)}`,
        `Q ${left.x.toFixed(1)} ${left.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`,
        `Q ${right.x.toFixed(1)} ${right.y.toFixed(1)} ${base.x.toFixed(1)} ${base.y.toFixed(1)}`,
        "Z",
      ].join(" ");
      return { d, color: c.color };
    });

    const ticks: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      major: boolean;
    }[] = [];
    for (let deg = 0; deg < 360; deg += 5) {
      const major = deg % 30 === 0;
      const inner = outerR - (major ? 10 : 5);
      const a = polar(cx, cy, inner, deg);
      const b = polar(cx, cy, outerR, deg);
      ticks.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major });
    }

    const letters = CARDINALS.map((c) => ({
      ...c,
      ...polar(cx, cy, outerR - 18, c.bearing),
    }));

    const words = CARDINALS.map((c) => {
      const p = polar(cx, cy, wordR, c.bearing);
      // Keep labels readable: slight offset so they sit outside cleanly
      let anchor: "middle" | "start" | "end" = "middle";
      let dx = 0;
      let dy = 0;
      if (c.bearing === 90) {
        anchor = "start";
        dx = 2;
      } else if (c.bearing === 270) {
        anchor = "end";
        dx = -2;
      } else if (c.bearing === 0) {
        dy = -2;
      } else if (c.bearing === 180) {
        dy = 4;
      }
      return { ...c, x: p.x + dx, y: p.y + dy, anchor };
    });

    return { cx, cy, outerR, hubR, petals, ticks, letters, words };
  }, [attributes]);

  const { cx, cy, outerR, hubR, petals, ticks, letters, words } = geometry;

  const onActivate = () => {
    if (live) return;
    setAsking(true);
    const run = async () => {
      if (isDeviceHeadingEnabled()) {
        wakeHeadingIfGranted();
        // If sensors still silent after a prior grant, force the iOS unlock once.
        await new Promise((r) => window.setTimeout(r, 400));
        if (getDeviceHeading() == null) {
          await requestHeadingPermission();
        }
        return;
      }
      await enableDeviceHeading();
    };
    void run().finally(() => setAsking(false));
  };

  return (
    <div className="w-full select-none">
      <button
        type="button"
        className="block w-full aspect-square max-h-[min(40vh,88vw)] mx-auto bg-transparent p-0 border-0 cursor-pointer"
        onClick={onActivate}
        aria-label={
          live
            ? `Live compass, facing ${Math.round(heading)} degrees`
            : "Tap to enable live compass"
        }
      >
        <svg
          viewBox="-12 -8 384 376"
          className="w-full h-full"
          role="img"
          aria-hidden
        >
          <defs>
            <radialGradient id={`hub-${uid}`} cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="#2A2E2B" />
              <stop offset="100%" stopColor="#181A18" />
            </radialGradient>
            <filter
              id={`glow-${uid}`}
              x="-35%"
              y="-35%"
              width="170%"
              height="170%"
            >
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Rotating rose: bezel, petals, cardinal letters */}
          <g transform={`rotate(${rotation.toFixed(2)} ${cx} ${cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={outerR}
              fill="none"
              stroke="#3A423D"
              strokeWidth="1.4"
            />
            <circle
              cx={cx}
              cy={cy}
              r={outerR - 12}
              fill="none"
              stroke="#262A27"
              strokeWidth="0.8"
            />

            {ticks.map((t, i) => (
              <line
                key={i}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.major ? "#4A524C" : "#2E3430"}
                strokeWidth={t.major ? 1.35 : 0.75}
              />
            ))}

            <g filter={`url(#glow-${uid})`} opacity="0.7">
              {petals.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  fill={p.color}
                  fillOpacity={0.22}
                  stroke={p.color}
                  strokeOpacity={0.35}
                  strokeWidth="1"
                />
              ))}
            </g>

            {letters.map((l) => (
              <text
                key={l.letter}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={l.color}
                fontSize="20"
                fontWeight="700"
              >
                {l.letter}
              </text>
            ))}

            {/* Words ride with their cardinal but counter-rotate to stay upright */}
            {words.map((w) => (
              <text
                key={w.word}
                x={w.x}
                y={w.y}
                textAnchor={w.anchor}
                dominantBaseline="middle"
                fill={w.color}
                fontSize="11"
                fontWeight="500"
                opacity="0.72"
                transform={`rotate(${(-rotation).toFixed(2)} ${w.x} ${w.y})`}
              >
                {w.word}
              </text>
            ))}
          </g>

          {/* Facing mark + hub stay screen-fixed */}
          <polygon
            points={`${cx},${cy - outerR - 7} ${cx - 5.5},${cy - outerR + 8} ${cx + 5.5},${cy - outerR + 8}`}
            fill={live ? "#F0EFEA" : "#5A625C"}
            opacity={live ? 0.95 : 0.5}
          />

          <circle
            cx={cx}
            cy={cy}
            r={hubR}
            fill={`url(#hub-${uid})`}
            stroke="#3A423D"
            strokeWidth="1.6"
          />
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fill="#F0EFEA"
            fontSize="18"
            fontWeight="700"
            className="tabular-nums"
          >
            Lv {level}
          </text>
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            fill="#9EA7A0"
            fontSize="11"
            fontWeight="500"
            className="tabular-nums"
          >
            {live ? `${Math.round(heading)}°` : `${streakDays}d streak`}
          </text>
        </svg>
      </button>
      {!live && (
        <p className="text-center text-[11px] text-ink-muted mt-0.5">
          {asking ? "Allow motion…" : "Tap to align"}
        </p>
      )}
    </div>
  );
}
