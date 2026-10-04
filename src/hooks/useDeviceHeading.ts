// src/hooks/useDeviceHeading.ts
"use client";

import { useEffect, useState } from "react";
import {
  shortestAngleDelta,
  subscribeDeviceHeading,
} from "@/lib/deviceHeading";

/** Smoothed compass heading in degrees (0 = north), or null if unavailable. */
export function useDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    let display: number | null = null;
    let target: number | null = null;
    let raf = 0;

    const tick = () => {
      raf = 0;
      if (target == null) return;
      if (display == null) {
        display = target;
        setHeading(display);
        return;
      }
      const delta = shortestAngleDelta(display, target);
      if (Math.abs(delta) < 0.15) {
        display = target;
        setHeading(display);
        return;
      }
      display = (display + delta * 0.2 + 360) % 360;
      setHeading(display);
      raf = requestAnimationFrame(tick);
    };

    const unsub = subscribeDeviceHeading((next) => {
      target = next;
      if (next == null) {
        display = null;
        setHeading(null);
        return;
      }
      if (!raf) raf = requestAnimationFrame(tick);
    });

    return () => {
      unsub();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return heading;
}
