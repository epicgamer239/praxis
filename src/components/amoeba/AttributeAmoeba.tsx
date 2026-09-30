// src/components/amoeba/AttributeAmoeba.tsx
"use client";

import React, { useMemo } from "react";
import { UserProfile } from "@/types";

interface AttributeAmoebaProps {
  attributes: UserProfile["attributes"];
}

export default function AttributeAmoeba({ attributes }: AttributeAmoebaProps) {
  const { pathData, levels } = useMemo(() => {
    const cx = 170;
    const cy = 150;

    const getEffLevel = (stat: {
      level: number;
      currentXp: number;
      maxXp: number;
    }) => {
      const fraction = stat.maxXp > 0 ? stat.currentXp / stat.maxXp : 0;
      return Math.min(5, Math.max(1, stat.level + fraction));
    };

    // Compass: N Neighborhood, E Energy, S Social, W Wisdom
    const nEff = getEffLevel(attributes.neighborhood);
    const eEff = getEffLevel(attributes.energy);
    const sEff = getEffLevel(attributes.social);
    const wEff = getEffLevel(attributes.wisdom);

    const levelToRadius = (eff: number) => 35 + (eff - 1) * 24;

    const rN = levelToRadius(nEff);
    const rE = levelToRadius(eEff);
    const rS = levelToRadius(sEff);
    const rW = levelToRadius(wEff);

    const rNE = Math.max(26, (rN + rE) / 2 - 22);
    const rSE = Math.max(26, (rE + rS) / 2 - 22);
    const rSW = Math.max(26, (rS + rW) / 2 - 22);
    const rNW = Math.max(26, (rW + rN) / 2 - 22);

    const diag = 0.7071;
    const pN = { x: cx, y: cy - rN };
    const pNE = { x: cx + rNE * diag, y: cy - rNE * diag };
    const pE = { x: cx + rE, y: cy };
    const pSE = { x: cx + rSE * diag, y: cy + rSE * diag };
    const pS = { x: cx, y: cy + rS };
    const pSW = { x: cx - rSW * diag, y: cy + rSW * diag };
    const pW = { x: cx - rW, y: cy };
    const pNW = { x: cx - rNW * diag, y: cy - rNW * diag };

    const pts = [pN, pNE, pE, pSE, pS, pSW, pW, pNW];

    let d = `M ${pts[0].x} ${pts[0].y} `;
    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const nextNext = pts[(i + 2) % pts.length];

      const cp1x = curr.x + (next.x - prev.x) / 6;
      const cp1y = curr.y + (next.y - prev.y) / 6;
      const cp2x = next.x - (nextNext.x - curr.x) / 6;
      const cp2y = next.y - (nextNext.y - curr.y) / 6;

      d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)} `;
    }
    d += "Z";

    return {
      pathData: d,
      levels: {
        n: nEff.toFixed(1),
        e: eEff.toFixed(1),
        s: sEff.toFixed(1),
        w: wEff.toFixed(1),
      },
    };
  }, [attributes]);

  return (
    <div className="relative w-full aspect-[452/308] flex items-center justify-center overflow-visible">
      <svg
        viewBox="-56 0 452 308"
        className="w-full h-full overflow-visible"
        overflow="visible"
      >
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

        <g stroke="#282E2A" strokeWidth="1" fill="none" opacity="0.6">
          <circle cx="170" cy="150" r="35" />
          <circle cx="170" cy="150" r="60" />
          <circle cx="170" cy="150" r="85" />
          <circle cx="170" cy="150" r="105" />
          <line x1="170" y1="35" x2="170" y2="265" />
          <line x1="55" y1="150" x2="285" y2="150" />
        </g>

        <g clipPath="url(#dynamicAmoebaClip)">
          <g filter="url(#dynamicMeshBlur)">
            {/* North: Neighborhood (Yellow) */}
            <polygon points="170,150 40,20 300,20" fill="#EAB308" />
            <circle cx="170" cy="80" r="50" fill="#FACC15" />

            {/* East: Energy (Green) */}
            <polygon points="170,150 300,20 300,280" fill="#16A34A" />
            <circle cx="235" cy="150" r="50" fill="#4ADE80" />

            {/* South: Social (Orange) */}
            <polygon points="170,150 300,280 40,280" fill="#EA580C" />
            <circle cx="170" cy="225" r="50" fill="#FB923C" />

            {/* West: Wisdom (Sky Blue) */}
            <polygon points="170,150 40,20 40,280" fill="#0284C7" />
            <circle cx="105" cy="150" r="50" fill="#38BDF8" />
          </g>
        </g>

        <path d={pathData} fill="none" stroke="#3A423D" strokeWidth="1.2" />

        {/* Compass letters */}
        <text
          x="170"
          y="22"
          textAnchor="middle"
          fill="#FACC15"
          className="text-[15px] font-semibold select-none"
        >
          N
        </text>
        <text
          x="170"
          y="36"
          textAnchor="middle"
          fill="#FACC15"
          className="text-[9px] font-medium select-none"
          opacity="0.85"
        >
          {levels.n}
        </text>

        <text
          x="300"
          y="148"
          textAnchor="start"
          fill="#4ADE80"
          className="text-[15px] font-semibold select-none"
        >
          E
        </text>
        <text
          x="300"
          y="162"
          textAnchor="start"
          fill="#4ADE80"
          className="text-[9px] font-medium select-none"
          opacity="0.85"
        >
          {levels.e}
        </text>

        <text
          x="170"
          y="288"
          textAnchor="middle"
          fill="#FB923C"
          className="text-[15px] font-semibold select-none"
        >
          S
        </text>
        <text
          x="170"
          y="302"
          textAnchor="middle"
          fill="#FB923C"
          className="text-[9px] font-medium select-none"
          opacity="0.85"
        >
          {levels.s}
        </text>

        <text
          x="40"
          y="148"
          textAnchor="end"
          fill="#38BDF8"
          className="text-[15px] font-semibold select-none"
        >
          W
        </text>
        <text
          x="40"
          y="162"
          textAnchor="end"
          fill="#38BDF8"
          className="text-[9px] font-medium select-none"
          opacity="0.85"
        >
          {levels.w}
        </text>
      </svg>
    </div>
  );
}
