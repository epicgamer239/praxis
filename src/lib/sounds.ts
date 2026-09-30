// src/lib/sounds.ts
/** Procedural accomplishment SFX via Web Audio — no asset files. */

export type SoundKind =
  | "submit"
  | "vouch"
  | "success"
  | "level"
  | "soft"
  | "boot";

let ctx: AudioContext | null = null;
let unlocked = false;
let unlocking: Promise<boolean> | null = null;
const pending: SoundKind[] = [];
let bootPlayed = false;
let splashEpoch = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

function flushPending() {
  if (!unlocked) return;
  const queue = pending.splice(0, pending.length);
  for (const kind of queue) {
    playSoundNow(kind);
  }
}

/** Must run inside a user gesture (tap/key). Unlocks Web Audio for the session. */
export async function unlockAudio(): Promise<boolean> {
  const c = getCtx();
  if (!c) return false;
  if (unlocked && c.state === "running") return true;

  if (!unlocking) {
    unlocking = (async () => {
      try {
        if (c.state === "suspended") {
          await c.resume();
        }
        // Silent buffer — required on iOS to fully unlock.
        const buffer = c.createBuffer(1, 1, 22050);
        const src = c.createBufferSource();
        src.buffer = buffer;
        src.connect(c.destination);
        src.start(0);
        unlocked = c.state === "running";
        if (unlocked) {
          // Late boot: first tap during/just after splash
          if (
            !bootPlayed &&
            splashEpoch > 0 &&
            Date.now() - splashEpoch < 4000
          ) {
            pending.unshift("boot");
          }
          flushPending();
        }
        return unlocked;
      } catch {
        return false;
      } finally {
        unlocking = null;
      }
    })();
  }
  return unlocking;
}

export function isAudioUnlocked() {
  return unlocked;
}

/** Call when splash mounts so the first tap can still play boot. */
export function markSplashForBoot() {
  splashEpoch = Date.now();
}

function beep(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  opts: {
    type?: OscillatorType;
    gain?: number;
    slideTo?: number;
  } = {},
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type || "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, opts.slideTo),
      start + dur,
    );
  }

  const peak = opts.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(g);
  g.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

function playSoundNow(kind: SoundKind) {
  const c = getCtx();
  if (!c || c.state !== "running") return;

  if (kind === "boot") {
    if (bootPlayed) return;
    bootPlayed = true;
  }

  const t = c.currentTime + 0.01;

  switch (kind) {
    case "soft":
      beep(c, 620, t, 0.08, { type: "triangle", gain: 0.1 });
      break;

    case "boot":
      beep(c, 220, t, 0.2, { type: "sine", gain: 0.12, slideTo: 349 });
      beep(c, 392, t + 0.14, 0.22, { type: "triangle", gain: 0.14 });
      beep(c, 523.25, t + 0.28, 0.36, { type: "sine", gain: 0.16 });
      break;

    case "vouch":
      beep(c, 392, t, 0.12, { type: "triangle", gain: 0.16 });
      beep(c, 523.25, t + 0.09, 0.18, { type: "sine", gain: 0.18 });
      break;

    case "submit":
      beep(c, 280, t, 0.14, { type: "sine", gain: 0.14, slideTo: 440 });
      beep(c, 554.37, t + 0.1, 0.16, { type: "triangle", gain: 0.16 });
      beep(c, 739.99, t + 0.2, 0.24, { type: "sine", gain: 0.18 });
      break;

    case "success":
      beep(c, 523.25, t, 0.15, { type: "triangle", gain: 0.17 });
      beep(c, 659.25, t + 0.1, 0.18, { type: "sine", gain: 0.18 });
      beep(c, 783.99, t + 0.2, 0.32, { type: "sine", gain: 0.2 });
      break;

    case "level":
      beep(c, 392, t, 0.13, { type: "triangle", gain: 0.15 });
      beep(c, 523.25, t + 0.11, 0.13, { type: "triangle", gain: 0.16 });
      beep(c, 659.25, t + 0.22, 0.15, { type: "sine", gain: 0.18 });
      beep(c, 783.99, t + 0.34, 0.2, { type: "sine", gain: 0.19 });
      beep(c, 1046.5, t + 0.48, 0.4, { type: "sine", gain: 0.22 });
      break;
  }
}

export function playSound(kind: SoundKind) {
  try {
    const c = getCtx();
    if (!c) return;

    if (!unlocked || c.state !== "running") {
      pending.push(kind);
      // Best-effort; only succeeds inside a gesture.
      void unlockAudio();
      return;
    }

    playSoundNow(kind);
  } catch {
    /* ignore */
  }
}

/**
 * Call at the start of click handlers (before await) so Safari keeps
 * AudioContext alive for the success sound after the network call.
 */
export function armAudioFromGesture() {
  void unlockAudio();
}

export function soundForHitKind(
  kind: "xp" | "submit" | "level" | "vouch" | undefined,
): SoundKind {
  if (kind === "level") return "level";
  if (kind === "submit") return "submit";
  if (kind === "vouch") return "vouch";
  return "success";
}
