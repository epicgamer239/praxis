// src/lib/deviceHeading.ts
/** Phone compass heading (degrees clockwise from magnetic north). */

type HeadingListener = (heading: number | null) => void;

const ENABLED_KEY = "praxis_heading_enabled";

const listeners = new Set<HeadingListener>();
let latest: number | null = null;
let listening = false;
let enabled = false;

type OrientationPayload = DeviceOrientationEvent & {
  webkitCompassHeading?: number | null;
  absolute?: boolean;
};

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(ENABLED_KEY, "1");
    else localStorage.removeItem(ENABLED_KEY);
  } catch {
    /* ignore */
  }
}

function publish(heading: number | null) {
  latest = heading;
  listeners.forEach((fn) => fn(heading));
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function headingFromEvent(e: OrientationPayload): number | null {
  // iOS Safari / PWA
  if (
    typeof e.webkitCompassHeading === "number" &&
    !Number.isNaN(e.webkitCompassHeading)
  ) {
    return normalizeDeg(e.webkitCompassHeading);
  }
  // Absolute orientation (Chrome / Firefox Android)
  if (typeof e.alpha === "number" && !Number.isNaN(e.alpha)) {
    if (e.absolute === true || e.type === "deviceorientationabsolute") {
      return normalizeDeg(360 - e.alpha);
    }
  }
  return null;
}

function onOrient(event: Event) {
  const heading = headingFromEvent(event as OrientationPayload);
  if (heading == null) return;
  publish(heading);
}

function attachListeners() {
  if (listening || typeof window === "undefined") return;
  window.addEventListener("deviceorientationabsolute", onOrient);
  window.addEventListener("deviceorientation", onOrient);
  listening = true;
}

function needsOrientationPermission(): boolean {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      }
    ).requestPermission === "function"
  );
}

async function ensurePermission(): Promise<boolean> {
  if (!needsOrientationPermission()) return true;
  try {
    const req = (
      DeviceOrientationEvent as unknown as {
        requestPermission: () => Promise<PermissionState | string>;
      }
    ).requestPermission;
    const state = await req.call(DeviceOrientationEvent);
    return state === "granted";
  } catch {
    return false;
  }
}

/** Call from a user gesture (splash / compass tap). Safe to call repeatedly. */
export async function enableDeviceHeading(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const ok = await ensurePermission();
  if (!ok) return false;
  enabled = true;
  writeEnabled(true);
  attachListeners();
  return true;
}

/** Resume listening after a prior grant (no prompt on most browsers). */
export function resumeDeviceHeading(): void {
  if (typeof window === "undefined") return;
  if (!readEnabled() && needsOrientationPermission()) return;
  enabled = true;
  attachListeners();
}

export function getDeviceHeading(): number | null {
  return latest;
}

export function isDeviceHeadingEnabled(): boolean {
  return enabled || readEnabled();
}

export function subscribeDeviceHeading(fn: HeadingListener): () => void {
  listeners.add(fn);
  fn(latest);
  resumeDeviceHeading();
  return () => {
    listeners.delete(fn);
  };
}

export function shortestAngleDelta(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
