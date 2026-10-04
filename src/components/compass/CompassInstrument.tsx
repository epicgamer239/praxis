// src/components/compass/CompassInstrument.tsx
"use client";

import React, { useId, useMemo } from "react";
import { UserProfile } from "@/types";
import { useDeviceHeading } from "@/hooks/useDeviceHeading";
import {
  enableDeviceHeading,
  isDeviceHeadingEnabled,
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

/** Arc path from startBearing → endBearing. */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startBearing: number,
  endBearing: number,
  clockwise = true,
) {
  const start = polar(cx, cy, r, startBearing);
  const end = polar(cx, cy, r, endBearing);
  const delta = clockwise
    ? (endBearing - startBearing + 360) % 360
    : (startBearing - endBearing + 360) % 360;
  const large = delta > 180 ? 1 : 0;
  const sweep = clockwise ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export default function CompassInstrument({
  attributes,
  level,
  streakDays,
}: CompassInstrumentProps) {
  const uid = useId().replace(/:/g, "");
  const heading = useDeviceHeading();
  const live = heading != null;
  const rotation = live ? -heading : 0;

  const geometry = useMemo(() => {
    const cx = 160;
    const cy = 160;
    const outerR = 128;
    const hubR = 36;
    const minR = hubR + 22;
    const maxR = 102;
    const labelR = outerR + 13;

    const rN = effRadius(attributes.neighborhood, minR, maxR);
    const rE = effRadius(attributes.energy, minR, maxR);
    const rS = effRadius(attributes.social, minR, maxR);
    const rW = effRadius(attributes.wisdom, minR, maxR);

    // Petal tips at NESW + softer intercardinals
    const radii = [
      rN,
      (rN + rE) * 0.42,
      rE,
      (rE + rS) * 0.42,
      rS,
      (rS + rW) * 0.42,
      rW,
      (rW + rN) * 0.42,
    ];
    const colors = [
      "#FACC15",
      "#A3E635",
      "#4ADE80",
      "#FBBF24",
      "#FB923C",
      "#F472B6",
      "#38BDF8",
      "#67E8F9",
    ];

    const petals = radii.map((r, i) => {
      const bearing = i * 45;
      const tip = polar(cx, cy, r, bearing);
      const left = polar(cx, cy, r * 0.55, bearing - 18);
      const right = polar(cx, cy, r * 0.55, bearing + 18);
      const base = polar(cx, cy, hubR + 2, bearing);
      const d = [
        `M ${base.x.toFixed(1)} ${base.y.toFixed(1)}`,
        `Q ${left.x.toFixed(1)} ${left.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`,
        `Q ${right.x.toFixed(1)} ${right.y.toFixed(1)} ${base.x.toFixed(1)} ${base.y.toFixed(1)}`,
        "Z",
      ].join(" ");
      return { d, color: colors[i], tip };
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
      const inner = outerR - (major ? 9 : 4.5);
      const a = polar(cx, cy, inner, deg);
      const b = polar(cx, cy, outerR, deg);
      ticks.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major });
    }

    const pathN = arcPath(cx, cy, labelR, 318, 42, true);
    const pathE = arcPath(cx, cy, labelR, 50, 130, true);
    const pathS = arcPath(cx, cy, labelR, 138, 222, true);
    const pathW = arcPath(cx, cy, labelR, 310, 230, false);

    const letterN = polar(cx, cy, outerR - 16, 0);
    const letterE = polar(cx, cy, outerR - 16, 90);
    const letterS = polar(cx, cy, outerR - 16, 180);
    const letterW = polar(cx, cy, outerR - 16, 270);

    return {
      cx,
      cy,
      outerR,
      hubR,
      petals,
      ticks,
      pathN,
      pathE,
      pathS,
      pathW,
      letterN,
      letterE,
      letterS,
      letterW,
    };
  }, [attributes]);

  const {
    cx,
    cy,
    outerR,
    hubR,
    petals,
    ticks,
    pathN,
    pathE,
    pathS,
    pathW,
    letterN,
    letterE,
    letterS,
    letterW,
  } = geometry;

  const idN = `arcN-${uid}`;
  const idE = `arcE-${uid}`;
  const idS = `arcS-${uid}`;
  const idW = `arcW-${uid}`;

  const onActivate = () => {
    if (!isDeviceHeadingEnabled() || heading == null) {
      void enableDeviceHeading();
    }
  };

  return (
    <div
      className="w-full select-none"
      style={{ height: "min(44vh, 380px)" }}
      onPointerDown={onActivate}
      role="presentation"
    >
      <svg
        viewBox="-48 -24 416 368"
        className="w-full h-full"
        role="img"
        aria-label={
          live
            ? `Compass · facing ${Math.round(heading)}° · Level ${level}`
            : `Compass · Level ${level} · ${streakDays}-day streak`
        }
      >
        <defs>
          <radialGradient id={`hub-${uid}`} cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#2A2E2B" />
            <stop offset="100%" stopColor="#181A18" />
          </radialGradient>
          <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Rose rotates opposite heading so N tracks magnetic north */}
        <g transform={`rotate(${rotation.toFixed(2)} ${cx} ${cy})`}>
          <path id={idN} d={pathN} fill="none" />
          <path id={idE} d={pathE} fill="none" />
          <path id={idS} d={pathS} fill="none" />
          <path id={idW} d={pathW} fill="none" />

          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="none"
            stroke="#3A423D"
            strokeWidth="1.25"
          />
          <circle
            cx={cx}
            cy={cy}
            r={outerR - 12}
            fill="none"
            stroke="#262A27"
            strokeWidth="0.75"
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

          <g filter={`url(#glow-${uid})`} opacity="0.9">
            {petals.map((p, i) => (
              <path
                key={i}
                d={p.d}
                fill={p.color}
                fillOpacity={0.38}
                stroke={p.color}
                strokeOpacity={0.55}
                strokeWidth="1"
              />
            ))}
          </g>

          <text
            x={letterN.x}
            y={letterN.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FACC15"
            fontSize="15"
            fontWeight="700"
          >
            N
          </text>
          <text
            x={letterE.x}
            y={letterE.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#4ADE80"
            fontSize="15"
            fontWeight="700"
          >
            E
          </text>
          <text
            x={letterS.x}
            y={letterS.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FB923C"
            fontSize="15"
            fontWeight="700"
          >
            S
          </text>
          <text
            x={letterW.x}
            y={letterW.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#38BDF8"
            fontSize="15"
            fontWeight="700"
          >
            W
          </text>

          <text
            fill="#FACC15"
            fontSize="10.5"
            fontWeight="500"
            letterSpacing="0.06em"
            opacity="0.92"
          >
            <textPath
              href={`#${idN}`}
              xlinkHref={`#${idN}`}
              startOffset="50%"
              textAnchor="middle"
            >
              Neighborhood
            </textPath>
          </text>
          <text
            fill="#4ADE80"
            fontSize="10.5"
            fontWeight="500"
            letterSpacing="0.08em"
            opacity="0.92"
          >
            <textPath
              href={`#${idE}`}
              xlinkHref={`#${idE}`}
              startOffset="50%"
              textAnchor="middle"
            >
              Energy
            </textPath>
          </text>
          <text
            fill="#FB923C"
            fontSize="10.5"
            fontWeight="500"
            letterSpacing="0.08em"
            opacity="0.92"
          >
            <textPath
              href={`#${idS}`}
              xlinkHref={`#${idS}`}
              startOffset="50%"
              textAnchor="middle"
            >
              Social
            </textPath>
          </text>
          <text
            fill="#38BDF8"
            fontSize="10.5"
            fontWeight="500"
            letterSpacing="0.08em"
            opacity="0.92"
          >
            <textPath
              href={`#${idW}`}
              xlinkHref={`#${idW}`}
              startOffset="50%"
              textAnchor="middle"
            >
              Wisdom
            </textPath>
          </text>
        </g>

        {/* Fixed lubber line — direction you are facing */}
        <polygon
          points={`${cx},${cy - outerR - 6} ${cx - 5},${cy - outerR + 8} ${cx + 5},${cy - outerR + 8}`}
          fill={live ? "#F0EFEA" : "#5A625C"}
          opacity={live ? 0.95 : 0.55}
        />

        {/* Hub stays screen-upright */}
        <circle
          cx={cx}
          cy={cy}
          r={hubR}
          fill={`url(#hub-${uid})`}
          stroke="#3A423D"
          strokeWidth="1.5"
        />
        <text
          x={cx}
          y={cy - 1}
          textAnchor="middle"
          fill="#F0EFEA"
          fontSize="16"
          fontWeight="700"
          className="tabular-nums"
        >
          Lv {level}
        </text>
        <text
          x={cx}
          y={cy + 15}
          textAnchor="middle"
          fill="#9EA7A0"
          fontSize="10"
          fontWeight="500"
          className="tabular-nums"
        >
          {live ? `${Math.round(heading)}°` : `${streakDays}d streak`}
        </text>
      </svg>
    </div>
  );
}
