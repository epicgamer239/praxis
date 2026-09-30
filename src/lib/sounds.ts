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

function silentUnlock(c: AudioContext) {
  try {
    const buffer = c.createBuffer(1, 1, c.sampleRate);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

function flushPending() {
  if (!unlocked) return;
  const queue = pending.splice(0, pending.length);
  for (const kind of queue) {
    playSoundNow(kind, true);
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
        silentUnlock(c);
        unlocked = c.state === "running";
        if (unlocked) flushPending();
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

/**
 * Unlock + play inside a tap. Critical for Safari PWA:
 * schedule audio only after resume actually reaches "running".
 */
export function unlockAndPlay(kind: SoundKind) {
  const c = getCtx();
  if (!c) return;

  // Allow boot again if a prior attempt failed silently.
  if (kind === "boot") bootPlayed = false;

  let finished = false;
  const finish = () => {
    if (finished) return;
    if (c.state !== "running") return;
    finished = true;
    silentUnlock(c);
    unlocked = true;
    playSoundNow(kind, true);
    flushPending();
  };

  // Fire resume immediately in the gesture stack (do not await here).
  if (c.state === "suspended" || c.state === "interrupted") {
    void c
      .resume()
      .then(() => {
        finish();
        // Safari sometimes needs a frame after resume.
        if (!finished) {
          requestAnimationFrame(() => {
            finish();
            if (!finished) window.setTimeout(finish, 40);
          });
        }
      })
      .catch(() => {
        window.setTimeout(finish, 40);
      });
  } else {
    finish();
  }
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
      Math.max(40, opts.slideTo),
      start + dur,
    );
  }

  const peak = opts.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(g);
  g.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function noiseBurst(
  c: AudioContext,
  start: number,
  dur: number,
  gain: number,
  fromHz: number,
  toHz: number,
) {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = Math.pow(1 - i / len, 1.4);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.85;
  filter.frequency.setValueAtTime(fromHz, start);
  filter.frequency.exponentialRampToValueAtTime(toHz, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(start);
  src.stop(start + dur + 0.05);
}

/** Tuned for phone speakers (audible mids/highs, not just sub-bass). */
function playMajesticBoot(c: AudioContext, t: number) {
  // Bright rip — hearable on tiny speakers
  noiseBurst(c, t, 0.32, 0.38, 1200, 4800);
  noiseBurst(c, t + 0.05, 0.4, 0.22, 700, 2600);

  // Opening strike
  beep(c, 392, t, 0.22, { type: "triangle", gain: 0.28 });
  beep(c, 784, t + 0.02, 0.28, { type: "sine", gain: 0.2 });
  beep(c, 1175, t + 0.04, 0.25, { type: "sine", gain: 0.12 });

  // Rising majestic ladder (phone-friendly range)
  beep(c, 220, t + 0.15, 0.85, { type: "sine", gain: 0.2, slideTo: 330 });
  beep(c, 330, t + 0.28, 0.9, { type: "triangle", gain: 0.22, slideTo: 494 });
  beep(c, 440, t + 0.42, 0.95, { type: "sine", gain: 0.24, slideTo: 659 });
  beep(c, 554, t + 0.55, 1.0, { type: "sine", gain: 0.2, slideTo: 880 });
  beep(c, 659, t + 0.68, 1.05, { type: "triangle", gain: 0.18, slideTo: 988 });

  // Halo shimmer
  beep(c, 988, t + 0.75, 0.9, { type: "sine", gain: 0.14, slideTo: 1319 });
  beep(c, 1319, t + 0.9, 0.85, { type: "sine", gain: 0.11, slideTo: 1760 });
  beep(c, 1760, t + 1.05, 0.7, { type: "triangle", gain: 0.08 });

  // Echo cadence
  beep(c, 523, t + 1.15, 0.55, { type: "sine", gain: 0.16 });
  beep(c, 784, t + 1.28, 0.55, { type: "sine", gain: 0.12 });
  beep(c, 1047, t + 1.4, 0.6, { type: "sine", gain: 0.1 });
}

function playSoundNow(kind: SoundKind, force = false) {
  const c = getCtx();
  if (!c) return;
  if (!force && c.state !== "running") return;

  if (kind === "boot") {
    if (bootPlayed) return;
    bootPlayed = true;
  }

  const t = c.currentTime + 0.02;

  switch (kind) {
    case "soft":
      beep(c, 620, t, 0.08, { type: "triangle", gain: 0.12 });
      break;

    case "boot":
      playMajesticBoot(c, t);
      break;

    case "vouch":
      beep(c, 392, t, 0.12, { type: "triangle", gain: 0.2 });
      beep(c, 523.25, t + 0.09, 0.18, { type: "sine", gain: 0.22 });
      break;

    case "submit":
      beep(c, 280, t, 0.14, { type: "sine", gain: 0.18, slideTo: 440 });
      beep(c, 554.37, t + 0.1, 0.16, { type: "triangle", gain: 0.2 });
      beep(c, 739.99, t + 0.2, 0.24, { type: "sine", gain: 0.22 });
      break;

    case "success":
      beep(c, 523.25, t, 0.15, { type: "triangle", gain: 0.22 });
      beep(c, 659.25, t + 0.1, 0.18, { type: "sine", gain: 0.22 });
      beep(c, 783.99, t + 0.2, 0.32, { type: "sine", gain: 0.24 });
      break;

    case "level":
      beep(c, 392, t, 0.13, { type: "triangle", gain: 0.18 });
      beep(c, 523.25, t + 0.11, 0.13, { type: "triangle", gain: 0.2 });
      beep(c, 659.25, t + 0.22, 0.15, { type: "sine", gain: 0.22 });
      beep(c, 783.99, t + 0.34, 0.2, { type: "sine", gain: 0.22 });
      beep(c, 1046.5, t + 0.48, 0.4, { type: "sine", gain: 0.26 });
      break;
  }
}

export function playSound(kind: SoundKind) {
  try {
    const c = getCtx();
    if (!c) return;

    if (!unlocked || c.state !== "running") {
      pending.push(kind);
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
