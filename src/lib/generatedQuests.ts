// src/lib/generatedQuests.ts
import { AttributeType, Quest } from "@/types";
import { DEED_XP } from "@/lib/progression";
import { QuestSetting } from "@/lib/questBank";
import { WeatherMood } from "@/lib/fieldConditions";

export type GeneratedBankQuest = Omit<Quest, "id" | "dateKey" | "status"> & {
  setting: QuestSetting;
  source: "gemini";
};

const ATTRIBUTES: AttributeType[] = [
  "neighborhood",
  "energy",
  "social",
  "wisdom",
];

const SETTINGS: QuestSetting[] = ["outdoor", "indoor", "either"];

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

    if (title.length < 12 || title.length > 140) continue;
    if (description.length < 20 || description.length > 280) continue;
    if (requiredProof.length < 12 || requiredProof.length > 200) continue;
    if (!ATTRIBUTES.includes(attribute)) continue;
    if (!SETTINGS.includes(setting)) continue;
    // Block obvious junk / digital-only quests
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
      source: "gemini",
    });
    if (out.length >= 12) break;
  }

  return out;
}

export function geminiQuestPrompt(input: {
  place: string;
  mood: WeatherMood;
  weatherLabel: string;
  airLabel: string;
}): string {
  return `You write real-world quests for Praxis, a civic action RPG.

Location: ${input.place}
Conditions: ${input.weatherLabel}; ${input.airLabel}; mood=${input.mood}

Return ONLY a JSON array of 8-12 objects. No markdown.
Each object keys:
- title (string, imperative, specific to this place when possible)
- description (string, 1-2 sentences)
- attribute: one of neighborhood | energy | social | wisdom
- setting: outdoor | indoor | either
- requiredProof (string, what photo proves it)

Rules:
- Must be doable in person today near ${input.place}
- No cars required; walking / local transit ok
- No paying large amounts, no politics door-knocking, no illegal acts
- Photo-proofable
- Bias indoor if mood is rain/cold or air is unhealthy; bias outdoor if fair
- Mix all four attributes
- Do NOT invent fake business names unless generic (e.g. "a local independent shop")
- Titles must be unique`;
}
