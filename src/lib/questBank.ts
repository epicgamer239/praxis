// src/lib/questBank.ts
import { Quest, AttributeType } from '@/types';
import { DEED_XP } from '@/lib/progression';
import { WeatherMood } from '@/lib/fieldConditions';
import { GeneratedBankQuest } from '@/lib/generatedQuests';
import { loadGeneratedQuests } from '@/lib/questRuntime';

export type QuestSetting = 'outdoor' | 'indoor' | 'either';

export const WEEKLY_REROLLS = 3;

type BankQuest = Omit<Quest, 'id'> & { setting: QuestSetting };

export const MASTER_QUEST_BANK: BankQuest[] = [
  // Social — South
  {
    title: 'Ask a local barista, cashier, or clerk for their personal favorite recommendation',
    description: 'Order or discuss their choice. Complete this interaction face-to-face with zero digital screens.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the item, storefront, or receipt with a note on the conversation.',
    setting: 'either',
  },
  {
    title: 'Give a genuine, unexpected compliment to someone you do not normally speak with',
    description: 'Notice something specific (e.g., their work, craft, or effort) and express authentic appreciation in person.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your location or activity with a brief field note on the interaction.',
    setting: 'either',
  },
  {
    title: 'Introduce yourself to a neighbor, peer, or local artisan you have never spoken to',
    description: 'Break the everyday ice with a simple greeting and brief conversation.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the area where you met with a note detailing the discussion.',
    setting: 'either',
  },

  // Neighborhood — North
  {
    title: 'Pick up and properly dispose of three pieces of litter along your commute or route',
    description: 'Leave a local trail, sidewalk, or community park visibly cleaner than you found it.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the collected litter in or beside a public trash/recycling bin.',
    setting: 'outdoor',
  },
  {
    title: 'Support an independent, locally owned non-chain shop in your community',
    description: 'Visit a family-owned grocery, independent bookstore, or neighborhood hardware store.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the local storefront or purchase item.',
    setting: 'either',
  },
  {
    title: 'Return 2 misplaced shopping carts or clean up an abandoned item in a public area',
    description: 'Perform a low-friction neighborhood deed that restores order to a shared space.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the returned cart bay or tidy public space.',
    setting: 'outdoor',
  },

  // Energy — East
  {
    title: 'Walk 4,000 steps without checking your mobile device once',
    description: 'Keep your phone pocketed or in "Do Not Disturb" mode for the entire duration of the walk.',
    attribute: 'energy',
    attributeLabel: 'Energy',
    xpReward: DEED_XP,
    requiredProof: 'Photo of a trail landmark, scenic path, or your step counter summary.',
    setting: 'outdoor',
  },
  {
    title: 'Explore a street, park trail, or neighborhood path you have never set foot on before',
    description: 'Intentionally alter your regular route to map new physical terrain in your town.',
    attribute: 'energy',
    attributeLabel: 'Energy',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the newly discovered landmark or trail marker.',
    setting: 'outdoor',
  },
  {
    title: 'Engage in 20 minutes of continuous bodyweight movement or physical outdoor labor',
    description: 'Yard work, stretching, calisthenics, or cycling without headphones or podcasts.',
    attribute: 'energy',
    attributeLabel: 'Energy',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your training environment or outdoor area.',
    setting: 'outdoor',
  },

  // Wisdom — West
  {
    title: 'Spend 20 continuous minutes reading physical paper (book, article, or journal)',
    description: 'No e-readers, iPads, or phone screens. Pure analog reading in a quiet space.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the open book and your analog reading space.',
    setting: 'indoor',
  },
  {
    title: 'Plan your entire day or reflect on a recent decision using pen and paper only',
    description: '15 minutes of uninterrupted analog thought with all electronic devices in another room.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your handwritten notes or planning notebook.',
    setting: 'indoor',
  },
  {
    title: 'Sit in complete silence outdoors for 10 continuous minutes with zero digital input',
    description: 'Observe surroundings, soundscapes, and breath without reaching for your device.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the outdoor seating location.',
    setting: 'outdoor',
  },
];

function getDayHash(dateStr: string, seed: string): number {
  let hash = 0;
  const combined = `${dateStr}-${seed}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function weatherWeight(setting: QuestSetting, mood: WeatherMood): number {
  if (mood === 'unknown') return 1;
  if (mood === 'rain') {
    if (setting === 'outdoor') return 0.12;
    if (setting === 'indoor') return 3.2;
    return 1.4;
  }
  if (mood === 'cold') {
    if (setting === 'outdoor') return 0.45;
    if (setting === 'indoor') return 2.2;
    return 1.1;
  }
  if (mood === 'hot') {
    if (setting === 'outdoor') return 0.55;
    if (setting === 'indoor') return 1.8;
    return 1.3;
  }
  // fair
  if (setting === 'outdoor') return 2.6;
  if (setting === 'indoor') return 0.65;
  return 1;
}

function parseBankIndex(questId: string): number | null {
  const match = /^quest_\d{4}-\d{2}-\d{2}_(\d+)$/.exec(questId);
  if (!match) return null;
  return Number(match[1]);
}

function questFromBankIndex(dateStr: string, bankIdx: number): Quest {
  const { setting: _setting, ...quest } = MASTER_QUEST_BANK[bankIdx];
  return {
    id: `quest_${dateStr}_${bankIdx}`,
    ...quest,
    dateKey: dateStr,
  };
}

function questFromGenerated(
  dateStr: string,
  idx: number,
  bank: GeneratedBankQuest,
): Quest {
  const { setting: _setting, source: _source, ...quest } = bank;
  return {
    id: `quest_${dateStr}_g_${idx}`,
    ...quest,
    dateKey: dateStr,
  };
}

/** Deterministic weighted picks so the same day+user+weather stay stable. */
function pickQuestIndices(
  dateStr: string,
  userSeed: string,
  mood: WeatherMood,
  count: number,
  exclude: Set<number> = new Set(),
  salt = 0,
): number[] {
  const hash = getDayHash(dateStr, `${userSeed}-${mood}-s${salt}`);
  const picked: number[] = [];
  const used = new Set<number>(exclude);

  for (let n = 0; n < count; n++) {
    let total = 0;
    const weights: number[] = [];
    for (let i = 0; i < MASTER_QUEST_BANK.length; i++) {
      if (used.has(i)) {
        weights.push(0);
        continue;
      }
      const w = weatherWeight(MASTER_QUEST_BANK[i].setting, mood);
      weights.push(w);
      total += w;
    }
    if (total <= 0) break;

    let target = ((((hash >> (n * 5)) + n * 17 + salt * 31) % 10000) / 10000) * total;
    let chosen = 0;
    for (let i = 0; i < weights.length; i++) {
      target -= weights[i];
      if (target <= 0) {
        chosen = i;
        break;
      }
      chosen = i;
    }
    used.add(chosen);
    picked.push(chosen);
  }

  return picked;
}

/**
 * Returns 3 daily quests for one user. Shared weather bias, unique seed per person
 * so guildmates often overlap but rarely share the full board.
 * Prefer 2 curated + 1 local when local quests exist.
 */
export function getDailyQuestsForUser(
  dateStr: string,
  userId: string,
  mood: WeatherMood = 'unknown',
  extras: GeneratedBankQuest[] = [],
): Quest[] {
  const seed = userId || 'DEFAULT';
  const local = extras.length > 0 ? extras : loadGeneratedQuests(dateStr);

  if (local.length === 0) {
    const selectedIndices = pickQuestIndices(dateStr, seed, mood, 3);
    return selectedIndices.map((bankIdx) => questFromBankIndex(dateStr, bankIdx));
  }

  const curatedIdx = pickQuestIndices(dateStr, seed, mood, 2);
  const localIdx = pickFromGenerated(dateStr, seed, mood, local, 1);

  const curated = curatedIdx.map((bankIdx) => questFromBankIndex(dateStr, bankIdx));
  const generated = localIdx.map((i) => questFromGenerated(dateStr, i, local[i]));

  return [...curated, ...generated];
}

/** @deprecated Use getDailyQuestsForUser — kept for any straggling imports. */
export function getDailyQuestsForGuild(
  dateStr: string,
  guildCode = 'DEFAULT',
  mood: WeatherMood = 'unknown',
  extras: GeneratedBankQuest[] = [],
): Quest[] {
  return getDailyQuestsForUser(dateStr, guildCode, mood, extras);
}

function pickFromGenerated(
  dateStr: string,
  userSeed: string,
  mood: WeatherMood,
  local: GeneratedBankQuest[],
  count: number,
): number[] {
  const hash = getDayHash(dateStr, `${userSeed}-gen-${mood}`);
  const picked: number[] = [];
  const used = new Set<number>();

  for (let n = 0; n < count; n++) {
    let total = 0;
    const weights: number[] = [];
    for (let i = 0; i < local.length; i++) {
      if (used.has(i)) {
        weights.push(0);
        continue;
      }
      const w = weatherWeight(local[i].setting, mood);
      weights.push(w);
      total += w;
    }
    if (total <= 0) break;
    let target = ((((hash >> (n * 5)) + n * 17) % 10000) / 10000) * total;
    let chosen = 0;
    for (let i = 0; i < weights.length; i++) {
      target -= weights[i];
      if (target <= 0) {
        chosen = i;
        break;
      }
      chosen = i;
    }
    used.add(chosen);
    picked.push(chosen);
  }
  return picked;
}

/** Resolve today's board from saved overrides or fresh per-user picks. */
export function resolveDailyBoard(
  dateStr: string,
  userId: string,
  mood: WeatherMood,
  extras: GeneratedBankQuest[],
  savedDate?: string | null,
  savedIds?: string[] | null,
): Quest[] {
  if (
    savedDate === dateStr &&
    Array.isArray(savedIds) &&
    savedIds.length === 3
  ) {
    const resolved = savedIds
      .map((id) => getQuestById(id))
      .filter((q): q is Quest => q !== null);
    if (resolved.length === 3) return resolved;
  }
  return getDailyQuestsForUser(dateStr, userId, mood, extras);
}

/**
 * Pick a replacement curated quest for one slot.
 * Always draws from the master bank so submit resolution stays reliable.
 */
export function pickRerollQuest(
  dateStr: string,
  userId: string,
  mood: WeatherMood,
  currentIds: string[],
  slotIndex: number,
  salt: number,
): Quest {
  const exclude = new Set<number>();
  for (const id of currentIds) {
    const idx = parseBankIndex(id);
    if (idx !== null) exclude.add(idx);
  }

  const picked = pickQuestIndices(
    dateStr,
    userId,
    mood,
    1,
    exclude,
    salt + slotIndex * 7 + 1,
  );
  if (picked.length === 0) {
    // Exhausted exclusions — fall back to any unused bank index
    for (let i = 0; i < MASTER_QUEST_BANK.length; i++) {
      if (!exclude.has(i)) {
        return questFromBankIndex(dateStr, i);
      }
    }
    return questFromBankIndex(dateStr, 0);
  }
  return questFromBankIndex(dateStr, picked[0]);
}

/** Resolve a quest by id even if it is not in today's weather-biased set. */
export function getQuestById(questId: string): Quest | null {
  const gen = /^quest_(\d{4}-\d{2}-\d{2})_g_(\d+)$/.exec(questId);
  if (gen) {
    const dateStr = gen[1];
    const idx = Number(gen[2]);
    const local = loadGeneratedQuests(dateStr);
    const bank = local[idx];
    if (!bank) return null;
    return questFromGenerated(dateStr, idx, bank);
  }

  const match = /^quest_(\d{4}-\d{2}-\d{2})_(\d+)$/.exec(questId);
  if (!match) return null;
  const dateStr = match[1];
  const bankIdx = Number(match[2]);
  const bank = MASTER_QUEST_BANK[bankIdx];
  if (!bank) return null;
  return questFromBankIndex(dateStr, bankIdx);
}

export function attributeOfBankIndex(bankIdx: number): AttributeType | null {
  return MASTER_QUEST_BANK[bankIdx]?.attribute ?? null;
}
