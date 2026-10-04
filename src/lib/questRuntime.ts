// src/lib/questRuntime.ts
import { GeneratedBankQuest } from "@/lib/generatedQuests";

const KEY = "praxis_shared_bank_v2";

type Stored = {
  cacheId: string;
  dateStr: string;
  place: string;
  mood: string;
  quests: GeneratedBankQuest[];
};

/** In-memory mirror so getQuestById works in the same session. */
let memory: Stored | null = null;

export function persistSharedQuestBank(input: {
  cacheId: string;
  dateStr: string;
  place: string;
  mood: string;
  quests: GeneratedBankQuest[];
}) {
  memory = input;
  try {
    localStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    /* ignore */
  }
}

export function loadGeneratedQuests(dateStr: string): GeneratedBankQuest[] {
  if (memory && memory.dateStr === dateStr) return memory.quests;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    if (parsed.dateStr !== dateStr) return [];
    if (!Array.isArray(parsed.quests)) return [];
    memory = parsed;
    return parsed.quests;
  } catch {
    return [];
  }
}

/** @deprecated alias */
export function persistGeneratedQuests(
  dateStr: string,
  place: string,
  quests: GeneratedBankQuest[],
) {
  persistSharedQuestBank({
    cacheId: `${dateStr}__legacy`,
    dateStr,
    place,
    mood: "unknown",
    quests,
  });
}
