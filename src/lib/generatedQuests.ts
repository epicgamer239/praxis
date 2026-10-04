// src/lib/generatedQuests.ts
import { AttributeType, GoalId, Quest } from "@/types";
import { DEED_XP } from "@/lib/progression";
import { QuestSetting } from "@/lib/questBank";
import { WeatherMood } from "@/lib/fieldConditions";

export type GeneratedBankQuest = Omit<Quest, "id" | "dateKey" | "status"> & {
  setting: QuestSetting;
  source: "gemini";
  difficulty: number;
  goals: GoalId[];
};

const ATTRIBUTES: AttributeType[] = [
  "neighborhood",
  "energy",
  "social",
  "wisdom",
];

const SETTINGS: QuestSetting[] = ["outdoor", "indoor", "either"];

const GOALS: GoalId[] = ["balanced", "confidence", "service"];

function labelFor(attr: AttributeType): string {
  switch (attr) {
    case "neighborhood":
      return "Neighborhood";
    case "energy":
      return "Energy";
    case "social":
      return "Social";
    case "wisdom":
      return "Wisdom";
  }
}

function clampDifficulty(n: number): number {
  if (!Number.isFinite(n)) return 2;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function normalizeGoals(raw: unknown): GoalId[] {
  if (!Array.isArray(raw)) return ["balanced"];
  const out: GoalId[] = [];
  for (const item of raw) {
    if (typeof item === "string" && GOALS.includes(item as GoalId)) {
      out.push(item as GoalId);
    }
  }
  if (out.length === 0) return ["balanced"];
  return [...new Set(out)];
}

export function placeCacheKey(place: string, dateStr: string, mood: WeatherMood) {
  const slug = place
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${dateStr}__${slug || "unknown"}__${mood}`;
}

export function validateGeneratedQuests(raw: unknown): GeneratedBankQuest[] {
  if (!Array.isArray(raw)) return [];
  const out: GeneratedBankQuest[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const title = typeof q.title === "string" ? q.title.trim() : "";
    const description =
      typeof q.description === "string" ? q.description.trim() : "";
    const requiredProof =
      typeof q.requiredProof === "string" ? q.requiredProof.trim() : "";
    const attribute = q.attribute as AttributeType;
    const setting = (q.setting as QuestSetting) || "either";
    const difficulty = clampDifficulty(Number(q.difficulty));
    const goals = normalizeGoals(q.goals);

    if (title.length < 12 || title.length > 140) continue;
    if (description.length < 20 || description.length > 280) continue;
    if (requiredProof.length < 12 || requiredProof.length > 200) continue;
    if (!ATTRIBUTES.includes(attribute)) continue;
    if (!SETTINGS.includes(setting)) continue;
    const blob = `${title} ${description}`.toLowerCase();
    if (
      /instagram|tiktok|twitter|facebook|discord|zoom|online only|crypto|donate money/.test(
        blob,
      )
    ) {
      continue;
    }

    out.push({
      title,
      description,
      attribute,
      attributeLabel: labelFor(attribute),
      xpReward: DEED_XP,
      requiredProof,
      setting,
      difficulty,
      goals,
      source: "gemini",
    });
    if (out.length >= 14) break;
  }

  return out;
}

export function geminiQuestPrompt(input: {
  place: string;
  mood: WeatherMood;
  weatherLabel: string;
  airLabel: string;
}): string {
  return `You write a shared daily quest bank for Praxis, a real-world civic RPG.

Location: ${input.place}
Conditions: ${input.weatherLabel}; ${input.airLabel}; mood=${input.mood}

Return ONLY a JSON array of 10-14 objects. No markdown.
Each object keys:
- title (string, imperative, specific to this place when possible)
- description (string, 1-2 sentences)
- attribute: one of neighborhood | energy | social | wisdom
- setting: outdoor | indoor | either
- requiredProof (string, what photo proves it)
- difficulty: integer 1-5 (1=tiny social/physical ask, 3=solid stretch, 5=bold public action)
- goals: array subset of ["balanced","confidence","service"]
  - confidence = social courage / speaking up / meeting people
  - service = helping others / neighborhood care
  - balanced = general growth (always include balanced if the quest fits anyone)

Rules:
- Must be doable in person today near ${input.place}
- No cars required; walking / local transit ok
- No paying large amounts, no politics door-knocking, no illegal acts
- Photo-proofable
- Bias indoor if mood is rain/cold or air is unhealthy; bias outdoor if fair
- Mix all four attributes
- Spread difficulties: include some 1-2, some 3, a few 4-5
- Cover confidence-leaning AND service-leaning quests, plus general ones
- Do NOT invent fake business names unless generic (e.g. "a local independent shop")
- Titles must be unique`;
}
