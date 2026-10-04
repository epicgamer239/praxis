// src/lib/deviceHeading.ts
/** Phone compass heading (degrees clockwise from magnetic north). */

type HeadingListener = (heading: number | null) => void;

const ENABLED_KEY = "praxis_heading_enabled";

const listeners = new Set<HeadingListener>();
let latest: number | null = null;
let listening = false;
let enabled = false;
/** True after sensors unlocked for this page load. */
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

function markArmed() {
  enabled = true;
  sessionArmed = true;
  attachListeners();
}

/**
 * Call from splash / enter gesture when the user already opted in before.
 * On iOS this must call requestPermission() each page load to start sensors —
 * if already allowed, that returns "granted" with no dialog.
 * First-time users: no-op (they opt in via the compass tap).
 */
export async function armDeviceHeading(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!readEnabled()) return false;
  if (sessionArmed && listening) {
    enabled = true;
    return true;
  }

  const ok = await requestOrientationPermission();
  if (!ok) return false;
  writeEnabled(true);
  markArmed();
  return true;
}

/**
 * First-time opt-in or manual retry from the compass.
 * May show the iOS motion dialog only if not already granted.
 */
export async function enableDeviceHeading(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (sessionArmed && listening) {
    enabled = true;
    return true;
  }

  const ok = await requestOrientationPermission();
  if (!ok) return false;
  writeEnabled(true);
  markArmed();
  return true;
}

/** @deprecated use armDeviceHeading */
export function wakeHeadingIfGranted(): boolean {
  if (!readEnabled()) return false;
  // Sync attach only — prefer armDeviceHeading from a gesture for iOS.
  markArmed();
  return true;
}

/** @deprecated use enableDeviceHeading */
export async function requestHeadingPermission(): Promise<boolean> {
  return enableDeviceHeading();
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
  // Listeners only — iOS still needs armDeviceHeading from a gesture each load.
  if (readEnabled()) {
    enabled = true;
    attachListeners();
  }
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
