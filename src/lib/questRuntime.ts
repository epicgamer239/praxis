// src/lib/questRuntime.ts
import { GeneratedBankQuest } from "@/lib/generatedQuests";

const KEY = "praxis_gen_quests_v1";

type Stored = {
  dateStr: string;
  place: string;
  quests: GeneratedBankQuest[];
};

export function persistGeneratedQuests(
  dateStr: string,
  place: string,
  quests: GeneratedBankQuest[],
) {
  try {
    const payload: Stored = { dateStr, place, quests };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function loadGeneratedQuests(dateStr: string): GeneratedBankQuest[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    if (parsed.dateStr !== dateStr) return [];
    return Array.isArray(parsed.quests) ? parsed.quests : [];
  } catch {
    return [];
  }
}
