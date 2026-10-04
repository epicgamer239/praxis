// src/lib/goals.ts
import { AttributeType, GoalId } from "@/types";

export type { GoalId };

export type GoalOption = {
  id: GoalId;
  label: string;
  blurb: string;
};

/** Signup / gate choices — keep copy short. */
export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "balanced",
    label: "Improve generally",
    blurb: "A mix across Neighborhood, Energy, Social, and Wisdom.",
  },
  {
    id: "confidence",
    label: "Become more confident",
    blurb: "Progressive social reps — start small, build up.",
  },
  {
    id: "service",
    label: "Help people more",
    blurb: "Neighborhood care and face-to-face generosity.",
  },
];

export function labelForGoal(id: GoalId | null | undefined): string {
  return GOAL_OPTIONS.find((g) => g.id === id)?.label ?? "Choose a goal";
}

/** How strongly each compass attribute serves a goal (multipliers). */
export function attributeBiasForGoal(
  goal: GoalId | null | undefined,
): Record<AttributeType, number> {
  switch (goal) {
    case "confidence":
      return {
        social: 2.4,
        wisdom: 1.15,
        energy: 1.05,
        neighborhood: 0.55,
      };
    case "service":
      return {
        neighborhood: 2.4,
        social: 1.6,
        energy: 0.85,
        wisdom: 0.7,
      };
    case "balanced":
    default:
      return {
        neighborhood: 1,
        energy: 1,
        social: 1,
        wisdom: 1,
      };
  }
}

export function clampDifficulty(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n * 10) / 10));
}

/** Starting band — approachable, room to step up. */
export const DEFAULT_QUEST_DIFFICULTY = 2;

/** Completing a quest nudges the band toward that quest’s level, slightly up. */
export function difficultyAfterComplete(
  current: number,
  questDifficulty: number,
): number {
  const blended = current * 0.65 + questDifficulty * 0.35 + 0.25;
  return clampDifficulty(blended);
}

/** Skip / reroll eases the next picks. */
export function difficultyAfterSkip(current: number): number {
  return clampDifficulty(current - 0.45);
}

/**
 * Readiness-style score for ranking a candidate.
 * Higher = better pick for this user right now.
 */
export function readinessScore(opts: {
  questDifficulty: number;
  userDifficulty: number;
  goalMatch: number;
  attrBias: number;
  weatherWeight: number;
  novelty: number;
}): number {
  const target = Math.min(5, opts.userDifficulty + 0.4);
  const skillFit = Math.max(0, 1.25 - Math.abs(opts.questDifficulty - target) * 0.55);
  const completion =
    opts.questDifficulty <= opts.userDifficulty + 1
      ? 1
      : Math.max(0.2, 1.1 - (opts.questDifficulty - opts.userDifficulty) * 0.35);

  return (
    0.35 * skillFit +
    0.25 * completion +
    0.2 * opts.novelty +
    0.2 * Math.min(1.2, opts.goalMatch) * opts.attrBias * Math.min(1.5, opts.weatherWeight / 1.2)
  );
}
