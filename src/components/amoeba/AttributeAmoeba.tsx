// src/components/amoeba/AttributeAmoeba.tsx
"use client";

import React, { useMemo } from "react";
import { UserProfile } from "@/types";

interface AttributeAmoebaProps {
  attributes: UserProfile["attributes"];
}

export default function AttributeAmoeba({ attributes }: AttributeAmoebaProps) {
  const { pathData, axisLevels } = useMemo(() => {
    const cx = 170;
    const cy = 150;

    // 1. Calculate fractional effective levels (e.g. Level 2 with 60/150 XP = 2.40)
    const getEffLevel = (stat: {
      level: number;
      currentXp: number;
      maxXp: number;
    }) => {
      const fraction = stat.maxXp > 0 ? stat.currentXp / stat.maxXp : 0;
      return Math.min(5, Math.max(1, stat.level + fraction));
    };

    const wisEff = getEffLevel(attributes.wisdom);
    const socEff = getEffLevel(attributes.social);
    const civEff = getEffLevel(attributes.civic);
    const vitEff = getEffLevel(attributes.vitality);

    // 2. Convert effective level (1.0 - 4.5) to radius in pixels
    // Level 1 = 35px, Level 2 = 60px, Level 3 = 85px, Level 4 = 105px
    const levelToRadius = (eff: number) => {
      return 35 + (eff - 1) * 24;
    };

    const rWis = levelToRadius(wisEff); // North (Wisdom)
    const rSoc = levelToRadius(socEff); // East (Social)
    const rCiv = levelToRadius(civEff); // South (Civic)
    const rVit = levelToRadius(vitEff); // West (Vitality)

    // 3. The 1-Level Divot Rule:
    // Divot radius = Average of adjacent tips MINUS ~22px (one level step), minimum 26px
    const rNE = Math.max(26, (rWis + rSoc) / 2 - 22);
    const rSE = Math.max(26, (rSoc + rCiv) / 2 - 22);
    const rSW = Math.max(26, (rCiv + rVit) / 2 - 22);
    const rNW = Math.max(26, (rVit + rWis) / 2 - 22);

    // 4. Calculate 8 Coordinate Points around the center
    const diagFactor = 0.7071; // cos(45 deg)

    const pN = { x: cx, y: cy - rWis };
    const pNE = { x: cx + rNE * diagFactor, y: cy - rNE * diagFactor };
    const pE = { x: cx + rSoc, y: cy };
    const pSE = { x: cx + rSE * diagFactor, y: cy + rSE * diagFactor };
    const pS = { x: cx, y: cy + rCiv };
    const pSW = { x: cx - rSW * diagFactor, y: cy + rSW * diagFactor };
    const pW = { x: cx - rVit, y: cy };
    const pNW = { x: cx - rNW * diagFactor, y: cy - rNW * diagFactor };

    const pts = [pN, pNE, pE, pSE, pS, pSW, pW, pNW];

    // 5. Generate smooth cubic Bézier loop connecting all 8 nodes
    let d = `M ${pts[0].x} ${pts[0].y} `;
    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const nextNext = pts[(i + 2) % pts.length];

      // Control points calculated via Catmull-Rom tangent smoothing
      const cp1x = curr.x + (next.x - prev.x) / 6;
      const cp1y = curr.y + (next.y - prev.y) / 6;
      const cp2x = next.x - (nextNext.x - curr.x) / 6;
      const cp2y = next.y - (nextNext.y - curr.y) / 6;

      d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)} `;
    }
    d += "Z";

    return {
      pathData: d,
      axisLevels: {
        wis: wisEff.toFixed(1),
        soc: socEff.toFixed(1),
        civ: civEff.toFixed(1),
        vit: vitEff.toFixed(1),
      },
    };
  }, [attributes]);

  return (
    <div className="relative w-full aspect-[340/300] flex items-center justify-center">
      <svg viewBox="0 0 340 300" className="w-full h-full">
        <defs>
          <filter
            id="dynamicMeshBlur"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="16" />
          </filter>

          <clipPath id="dynamicAmoebaClip">
            <path d={pathData} />
          </clipPath>
        </defs>

        {/* Reference Rings */}
        <g stroke="#282E2A" strokeWidth="1" fill="none" opacity="0.6">
          <circle cx="170" cy="150" r="35" />
          <circle cx="170" cy="150" r="60" />
          <circle cx="170" cy="150" r="85" />
          <circle cx="170" cy="150" r="105" />
          <line x1="170" y1="35" x2="170" y2="265" />
          <line x1="55" y1="150" x2="285" y2="150" />
        </g>

        {/* 4-Quadrant Color Mesh Engine */}
        <g clipPath="url(#dynamicAmoebaClip)">
          <g filter="url(#dynamicMeshBlur)">
            {/* North: Wisdom (Sky Blue) */}
            <polygon points="170,150 40,20 300,20" fill="#0284C7" />
            <circle cx="170" cy="80" r="50" fill="#38BDF8" />

            {/* West: Vitality (Green) */}
            <polygon points="170,150 40,20 40,280" fill="#16A34A" />
            <circle cx="105" cy="150" r="50" fill="#4ADE80" />

            {/* East: Social (Orange) */}
            <polygon points="170,150 300,20 300,280" fill="#EA580C" />
            <circle cx="235" cy="150" r="50" fill="#FB923C" />

            {/* South: Civic (Yellow) */}
            <polygon points="170,150 300,280 40,280" fill="#EAB308" />
            <circle cx="170" cy="225" r="50" fill="#FACC15" />
          </g>
        </g>

        {/* Crisp Hairline Border */}
        <path d={pathData} fill="none" stroke="#3A423D" strokeWidth="1.2" />

        {/* Live Axis Indicators */}
        <text
          x="170"
          y="26"
          textAnchor="middle"
          fill="#38BDF8"
          className="text-[11px] font-medium select-none"
        >
          Wisdom L{axisLevels.wis}
        </text>
        <text
          x="295"
          y="154"
          textAnchor="start"
          fill="#FB923C"
          className="text-[11px] font-medium select-none"
        >
          Social L{axisLevels.soc}
        </text>
        <text
          x="170"
          y="284"
          textAnchor="middle"
          fill="#FACC15"
          className="text-[11px] font-medium select-none"
        >
          Civic L{civicLevelFormatted(attributes.civic)}
        </text>
        <text
          x="45"
          y="154"
          textAnchor="end"
          fill="#4ADE80"
          className="text-[11px] font-medium select-none"
        >
          Vitality L{axisLevels.vit}
        </text>
      </svg>
    </div>
  );
}

function civicLevelFormatted(stat: {
  level: number;
  currentXp: number;
  maxXp: number;
}) {
  const fraction = stat.maxXp > 0 ? stat.currentXp / stat.maxXp : 0;
  return (stat.level + fraction).toFixed(1);
}
