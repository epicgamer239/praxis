// src/lib/sounds.ts
/** Procedural accomplishment SFX via Web Audio — no asset files. */

export type SoundKind = "submit" | "vouch" | "success" | "level" | "soft" | "boot";

let ctx: AudioContext | null = null;

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

/** Call on first tap so browsers allow playback. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    void c.resume().catch(() => {
      /* ignore */
    });
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
      Math.max(1, opts.slideTo),
      start + dur,
    );
  }

  const peak = opts.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(g);
  g.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playSound(kind: SoundKind) {
  try {
    unlockAudio();
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") {
      void c.resume().then(() => playSound(kind)).catch(() => {});
      return;
    }

    const t = c.currentTime + 0.01;

    switch (kind) {
      case "soft":
        beep(c, 620, t, 0.07, { type: "triangle", gain: 0.06 });
        break;

      case "boot":
        // soft leaf open — quiet so splash isn't loud
        beep(c, 220, t, 0.18, {
          type: "sine",
          gain: 0.055,
          slideTo: 330,
        });
        beep(c, 392, t + 0.14, 0.2, { type: "triangle", gain: 0.07 });
        beep(c, 523.25, t + 0.28, 0.32, { type: "sine", gain: 0.08 });
        break;

      case "vouch":
        // warm confirm
        beep(c, 392, t, 0.11, { type: "triangle", gain: 0.1 });
        beep(c, 523.25, t + 0.09, 0.16, { type: "sine", gain: 0.11 });
        break;

      case "submit":
        // publish whoosh-up
        beep(c, 280, t, 0.12, {
          type: "sine",
          gain: 0.09,
          slideTo: 440,
        });
        beep(c, 554.37, t + 0.1, 0.14, { type: "triangle", gain: 0.1 });
        beep(c, 739.99, t + 0.2, 0.2, { type: "sine", gain: 0.12 });
        break;

      case "success":
        // deed locked — bright triad
        beep(c, 523.25, t, 0.14, { type: "triangle", gain: 0.11 });
        beep(c, 659.25, t + 0.1, 0.16, { type: "sine", gain: 0.12 });
        beep(c, 783.99, t + 0.2, 0.28, { type: "sine", gain: 0.13 });
        break;

      case "level":
        // fanfare
        beep(c, 392, t, 0.12, { type: "triangle", gain: 0.1 });
        beep(c, 523.25, t + 0.11, 0.12, { type: "triangle", gain: 0.11 });
        beep(c, 659.25, t + 0.22, 0.14, { type: "sine", gain: 0.12 });
        beep(c, 783.99, t + 0.34, 0.18, { type: "sine", gain: 0.13 });
        beep(c, 1046.5, t + 0.48, 0.35, { type: "sine", gain: 0.14 });
        break;
    }
  } catch {
    /* ignore */
  }
}

export function soundForHitKind(
  kind: "xp" | "submit" | "level" | "vouch" | undefined,
): SoundKind {
  if (kind === "level") return "level";
  if (kind === "submit") return "submit";
  if (kind === "vouch") return "vouch";
  return "success";
}
