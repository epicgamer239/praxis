// src/lib/deviceHeading.ts
/** Phone compass heading (degrees clockwise from magnetic north). */

type HeadingListener = (heading: number | null) => void;

const ENABLED_KEY = "praxis_heading_enabled";

const listeners = new Set<HeadingListener>();
let latest: number | null = null;
let listening = false;
let enabled = false;
/** True after we've unlocked sensors for this page load. */
let sessionArmed = false;

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
  if (
    typeof e.webkitCompassHeading === "number" &&
    !Number.isNaN(e.webkitCompassHeading)
  ) {
    return normalizeDeg(e.webkitCompassHeading);
  }
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

async function requestOrientationPermission(): Promise<boolean> {
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

/**
 * Resume compass for a user who already opted in (localStorage).
 * Does not call requestPermission — avoids the iOS dialog on every launch.
 * Call from a user gesture so sensors are allowed to start where required.
 */
export function wakeHeadingIfGranted(): boolean {
  if (typeof window === "undefined") return false;
  if (!readEnabled()) return false;
  enabled = true;
  sessionArmed = true;
  attachListeners();
  return true;
}

/**
 * First-time (or retry) opt-in. May show the iOS motion dialog.
 * Call only from an explicit compass tap — not from splash.
 */
export async function enableDeviceHeading(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Already armed this session — just ensure listeners.
  if (sessionArmed && listening && readEnabled()) {
    enabled = true;
    return true;
  }

  // Returning user: wake without re-prompting.
  if (readEnabled()) {
    wakeHeadingIfGranted();
    // If iOS still needs an explicit grant call for this document and events
    // never arrive, a later compass tap can retry via force path below.
    return true;
  }

  const ok = await requestOrientationPermission();
  if (!ok) return false;
  enabled = true;
  sessionArmed = true;
  writeEnabled(true);
  attachListeners();
  return true;
}

/**
 * Force permission prompt (compass tap when wake didn't produce events).
 */
export async function requestHeadingPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const ok = await requestOrientationPermission();
  if (!ok) return false;
  enabled = true;
  sessionArmed = true;
  writeEnabled(true);
  attachListeners();
  return true;
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
  // Silent resume if they opted in before — no permission API.
  wakeHeadingIfGranted();
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
