// src/lib/questBank.ts
import { Quest, AttributeType, GoalId } from '@/types';
import { DEED_XP } from '@/lib/progression';
import { WeatherMood } from '@/lib/fieldConditions';
import { GeneratedBankQuest } from '@/lib/generatedQuests';
import { loadGeneratedQuests } from '@/lib/questRuntime';
import {
  DEFAULT_QUEST_DIFFICULTY,
  attributeBiasForGoal,
  readinessScore,
} from '@/lib/goals';

export type QuestSetting = 'outdoor' | 'indoor' | 'either';

export const WEEKLY_REROLLS = 3;

export type BoardAdaptive = {
  goalId?: GoalId | null;
  difficulty?: number;
};

type BankQuest = Omit<Quest, 'id'> & {
  setting: QuestSetting;
  difficulty: number;
  goals: GoalId[];
};

/**
 * Curated quest graph nodes.
 * difficulty 1–5 · goals tag which focuses they advance.
 */
export const MASTER_QUEST_BANK: BankQuest[] = [
  // —— Social / confidence ladder ——
  {
    title: 'Make brief eye contact and smile at three people while out',
    description: 'No conversation required — just present, friendly acknowledgment in public.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the place you were walking with a short note.',
    setting: 'either',
    difficulty: 1,
    goals: ['confidence', 'balanced'],
  },
  {
    title: 'Say hello out loud to someone you pass (neighbor, barista, classmate)',
    description: 'A clear greeting counts. You do not need to start a full conversation.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the location with a note on who you greeted.',
    setting: 'either',
    difficulty: 1,
    goals: ['confidence', 'balanced'],
  },
  {
    title: 'Ask a local barista, cashier, or clerk for their personal favorite recommendation',
    description: 'Order or discuss their choice face-to-face with zero digital screens.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the item, storefront, or receipt with a note on the conversation.',
    setting: 'either',
    difficulty: 2,
    goals: ['confidence', 'service', 'balanced'],
  },
  {
    title: 'Give a genuine, unexpected compliment to someone you do not normally speak with',
    description: 'Notice something specific and express authentic appreciation in person.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your location with a brief field note on the interaction.',
    setting: 'either',
    difficulty: 2,
    goals: ['confidence', 'service', 'balanced'],
  },
  {
    title: 'Introduce yourself to a neighbor, peer, or local artisan you have never spoken to',
    description: 'Break the everyday ice with a simple greeting and brief conversation.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the area where you met with a note detailing the discussion.',
    setting: 'either',
    difficulty: 3,
    goals: ['confidence', 'balanced'],
  },
  {
    title: 'Ask a question in a group setting (class, meeting, club, or team huddle)',
    description: 'Speak once so others hear you. The question can be simple and practical.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the room or building with a note on what you asked.',
    setting: 'either',
    difficulty: 3,
    goals: ['confidence'],
  },
  {
    title: 'Hold a 5-minute in-person conversation with someone new or unfamiliar',
    description: 'Stay present without checking your phone. Listen more than you perform.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the place you talked with a short reflection note.',
    setting: 'either',
    difficulty: 4,
    goals: ['confidence', 'balanced'],
  },
  {
    title: 'Invite someone to a low-stakes hang (walk, coffee, study) and follow through',
    description: 'Send or ask in person, then actually do the thing together today or this week.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo from the hangout with a note on who joined.',
    setting: 'either',
    difficulty: 4,
    goals: ['confidence'],
  },
  {
    title: 'Speak for 60 seconds in front of a small group (toast, update, or story)',
    description: 'Any real audience of 3+ people. Notes allowed; phone scrolling is not.',
    attribute: 'social',
    attributeLabel: 'Social',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the gathering space with a note on what you shared.',
    setting: 'either',
    difficulty: 5,
    goals: ['confidence'],
  },

  // —— Neighborhood / service ——
  {
    title: 'Hold a door or help someone with a small physical task without being asked',
    description: 'One clear act of help in public — bags, stroller, door, directions.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the place with a note on what you helped with.',
    setting: 'either',
    difficulty: 1,
    goals: ['service', 'balanced'],
  },
  {
    title: 'Pick up and properly dispose of three pieces of litter along your commute or route',
    description: 'Leave a local trail, sidewalk, or community park visibly cleaner.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the collected litter in or beside a public trash/recycling bin.',
    setting: 'outdoor',
    difficulty: 2,
    goals: ['service', 'balanced'],
  },
  {
    title: 'Support an independent, locally owned non-chain shop in your community',
    description: 'Visit a family-owned grocery, independent bookstore, or neighborhood hardware store.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the local storefront or purchase item.',
    setting: 'either',
    difficulty: 2,
    goals: ['service', 'balanced'],
  },
  {
    title: 'Return 2 misplaced shopping carts or clean up an abandoned item in a public area',
    description: 'A low-friction neighborhood deed that restores order to a shared space.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the returned cart bay or tidy public space.',
    setting: 'outdoor',
    difficulty: 2,
    goals: ['service', 'balanced'],
  },
  {
    title: 'Offer help to a neighbor, classmate, or coworker with something concrete today',
    description: 'Ask “need a hand with that?” and follow through for at least 10 minutes.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo near where you helped with a note on the task.',
    setting: 'either',
    difficulty: 3,
    goals: ['service', 'confidence'],
  },
  {
    title: 'Donate or deliver a useful item (food, clothes, supplies) to a person or local drive',
    description: 'Something someone else can use today — not a vague future intention.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the donation drop-off or handoff.',
    setting: 'either',
    difficulty: 3,
    goals: ['service'],
  },
  {
    title: 'Spend 30 minutes volunteering or assisting at a local org, event, or campus drive',
    description: 'Show up in person and do the unglamorous work they actually need.',
    attribute: 'neighborhood',
    attributeLabel: 'Neighborhood',
    xpReward: DEED_XP,
    requiredProof: 'Photo at the site with a note on what you did.',
    setting: 'either',
    difficulty: 4,
    goals: ['service'],
  },

  // —— Energy ——
  {
    title: 'Take a 15-minute outdoor walk without headphones',
    description: 'Phone stays away except for the proof photo at the end.',
    attribute: 'energy',
    attributeLabel: 'Energy',
    xpReward: DEED_XP,
    requiredProof: 'Photo from somewhere along your route.',
    setting: 'outdoor',
    difficulty: 1,
    goals: ['balanced', 'confidence'],
  },
  {
    title: 'Walk 4,000 steps without checking your mobile device once',
    description: 'Keep your phone pocketed or on Do Not Disturb for the entire walk.',
    attribute: 'energy',
    attributeLabel: 'Energy',
    xpReward: DEED_XP,
    requiredProof: 'Photo of a trail landmark, scenic path, or your step counter summary.',
    setting: 'outdoor',
    difficulty: 2,
    goals: ['balanced', 'confidence'],
  },
  {
    title: 'Explore a street, park trail, or neighborhood path you have never set foot on before',
    description: 'Intentionally alter your regular route to map new physical terrain.',
    attribute: 'energy',
    attributeLabel: 'Energy',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the newly discovered landmark or trail marker.',
    setting: 'outdoor',
    difficulty: 3,
    goals: ['balanced'],
  },
  {
    title: 'Engage in 20 minutes of continuous bodyweight movement or physical outdoor labor',
    description: 'Yard work, stretching, calisthenics, or cycling without headphones or podcasts.',
    attribute: 'energy',
    attributeLabel: 'Energy',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your training environment or outdoor area.',
    setting: 'outdoor',
    difficulty: 3,
    goals: ['balanced'],
  },

  // —— Wisdom ——
  {
    title: 'Write three sentences about how you want to show up today — pen and paper only',
    description: 'Devices in another room for those few minutes.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your handwritten note.',
    setting: 'indoor',
    difficulty: 1,
    goals: ['balanced', 'confidence'],
  },
  {
    title: 'Spend 20 continuous minutes reading physical paper (book, article, or journal)',
    description: 'No e-readers, iPads, or phone screens. Pure analog reading.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the open book and your analog reading space.',
    setting: 'indoor',
    difficulty: 2,
    goals: ['balanced'],
  },
  {
    title: 'Plan your entire day or reflect on a recent decision using pen and paper only',
    description: '15 minutes of uninterrupted analog thought with devices elsewhere.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your handwritten notes or planning notebook.',
    setting: 'indoor',
    difficulty: 2,
    goals: ['balanced', 'confidence'],
  },
  {
    title: 'Sit in complete silence outdoors for 10 continuous minutes with zero digital input',
    description: 'Observe surroundings, soundscapes, and breath without reaching for your device.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the outdoor seating location.',
    setting: 'outdoor',
    difficulty: 3,
    goals: ['balanced', 'confidence'],
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
  const { setting: _s, goals: _g, ...quest } = MASTER_QUEST_BANK[bankIdx];
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
  const { setting: _setting, source: _source, goals: _goals, ...quest } = bank;
  return {
    id: `quest_${dateStr}_g_${idx}`,
    ...quest,
    difficulty: bank.difficulty,
    dateKey: dateStr,
  };
}

function goalMatchWeight(
  goals: GoalId[],
  goalId: GoalId | null | undefined,
): number {
  if (!goalId) return 1;
  if (goals.includes(goalId)) return 1.35;
  if (goalId !== 'balanced' && goals.includes('balanced')) return 0.55;
  return 0.25;
}

function scoreCandidate(
  opts: {
    difficulty: number;
    attribute: AttributeType;
    setting: QuestSetting;
    goals: GoalId[];
  },
  mood: WeatherMood,
  adaptive: BoardAdaptive,
  novelty: number,
): number {
  const userDiff = adaptive.difficulty ?? DEFAULT_QUEST_DIFFICULTY;
  const bias = attributeBiasForGoal(adaptive.goalId);
  const ww = weatherWeight(opts.setting, mood);
  return (
    readinessScore({
      questDifficulty: opts.difficulty,
      userDifficulty: userDiff,
      goalMatch: goalMatchWeight(opts.goals, adaptive.goalId),
      attrBias: bias[opts.attribute],
      weatherWeight: ww,
      novelty,
    }) * ww
  );
}

function scoreBankQuest(
  quest: BankQuest,
  mood: WeatherMood,
  adaptive: BoardAdaptive,
  novelty: number,
): number {
  return scoreCandidate(quest, mood, adaptive, novelty);
}

/** Deterministic weighted picks with goal + difficulty readiness. */
function pickQuestIndices(
  dateStr: string,
  userSeed: string,
  mood: WeatherMood,
  count: number,
  exclude: Set<number> = new Set(),
  salt = 0,
  blockedAttributes: Set<AttributeType> = new Set(),
  adaptive: BoardAdaptive = {},
  enforceUniqueAttrs = true,
): number[] {
  const hash = getDayHash(
    dateStr,
    `${userSeed}-${mood}-s${salt}-g${adaptive.goalId || 'none'}-d${adaptive.difficulty ?? DEFAULT_QUEST_DIFFICULTY}`,
  );
  const picked: number[] = [];
  const used = new Set<number>(exclude);
  const usedAttrs = new Set<AttributeType>(blockedAttributes);

  for (let n = 0; n < count; n++) {
    let chosen = weightedBankPick(
      hash,
      n,
      salt,
      mood,
      used,
      usedAttrs,
      adaptive,
      enforceUniqueAttrs,
    );
    if (chosen === null && enforceUniqueAttrs) {
      chosen = weightedBankPick(
        hash,
        n,
        salt,
        mood,
        used,
        usedAttrs,
        adaptive,
        false,
      );
    }
    if (chosen === null) break;
    used.add(chosen);
    usedAttrs.add(MASTER_QUEST_BANK[chosen].attribute);
    picked.push(chosen);
  }

  return picked;
}

function weightedBankPick(
  hash: number,
  n: number,
  salt: number,
  mood: WeatherMood,
  used: Set<number>,
  usedAttrs: Set<AttributeType>,
  adaptive: BoardAdaptive,
  enforceUniqueAttrs: boolean,
): number | null {
  let total = 0;
  const weights: number[] = [];
  for (let i = 0; i < MASTER_QUEST_BANK.length; i++) {
    if (
      used.has(i) ||
      (enforceUniqueAttrs && usedAttrs.has(MASTER_QUEST_BANK[i].attribute))
    ) {
      weights.push(0);
      continue;
    }
    const novelty = 0.55 + ((hash >> ((i + n) % 12)) % 50) / 100;
    const w = scoreBankQuest(MASTER_QUEST_BANK[i], mood, adaptive, novelty);
    weights.push(Math.max(0, w));
    total += Math.max(0, w);
  }
  if (total <= 0) return null;

  let target =
    ((((hash >> (n * 5)) + n * 17 + salt * 31) % 10000) / 10000) * total;
  let chosen = 0;
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i];
    if (target <= 0) {
      chosen = i;
      break;
    }
    chosen = i;
  }
  return chosen;
}

/**
 * Returns 3 daily quests for one user.
 * Prefer the shared Gemini bank (same pool for friends in that place/day).
 * Curated bank is fallback when Gemini/location is unavailable.
 */
export function getDailyQuestsForUser(
  dateStr: string,
  userId: string,
  mood: WeatherMood = 'unknown',
  extras: GeneratedBankQuest[] = [],
  adaptive: BoardAdaptive = {},
): Quest[] {
  const seed = userId || 'DEFAULT';
  const local = extras.length > 0 ? extras : loadGeneratedQuests(dateStr);

  // Shared Gemini bank is large enough — pick all 3 from it.
  if (local.length >= 4) {
    const idxs = pickFromGenerated(
      dateStr,
      seed,
      mood,
      local,
      3,
      new Set(),
      adaptive,
    );
    if (idxs.length === 3) {
      return idxs.map((i) => questFromGenerated(dateStr, i, local[i]));
    }
    // Partial fill from Gemini, rest curated
    const fromGen = idxs.map((i) => questFromGenerated(dateStr, i, local[i]));
    const blocked = new Set(fromGen.map((q) => q.attribute));
    const need = 3 - fromGen.length;
    const curatedIdx = pickQuestIndices(
      dateStr,
      seed,
      mood,
      need,
      new Set(),
      3,
      blocked,
      adaptive,
    );
    return [
      ...fromGen,
      ...curatedIdx.map((bankIdx) => questFromBankIndex(dateStr, bankIdx)),
    ];
  }

  // Fallback: curated only
  const selectedIndices = pickQuestIndices(
    dateStr,
    seed,
    mood,
    3,
    new Set(),
    0,
    new Set(),
    adaptive,
  );
  return selectedIndices.map((bankIdx) => questFromBankIndex(dateStr, bankIdx));
}

/** @deprecated Use getDailyQuestsForUser */
export function getDailyQuestsForGuild(
  dateStr: string,
  guildCode = 'DEFAULT',
  mood: WeatherMood = 'unknown',
  extras: GeneratedBankQuest[] = [],
  adaptive: BoardAdaptive = {},
): Quest[] {
  return getDailyQuestsForUser(dateStr, guildCode, mood, extras, adaptive);
}

function pickFromGenerated(
  dateStr: string,
  userSeed: string,
  mood: WeatherMood,
  local: GeneratedBankQuest[],
  count: number,
  blockedAttributes: Set<AttributeType> = new Set(),
  adaptive: BoardAdaptive = {},
  excludeIdx: Set<number> = new Set(),
): number[] {
  const hash = getDayHash(
    dateStr,
    `${userSeed}-gen-${mood}-${adaptive.goalId}-d${adaptive.difficulty ?? DEFAULT_QUEST_DIFFICULTY}`,
  );
  const picked: number[] = [];
  const used = new Set<number>(excludeIdx);
  const usedAttrs = new Set<AttributeType>(blockedAttributes);

  for (let n = 0; n < count; n++) {
    let chosen = weightedGeneratedPick(
      local,
      hash,
      n,
      mood,
      used,
      usedAttrs,
      adaptive,
      true,
    );
    if (chosen === null) {
      chosen = weightedGeneratedPick(
        local,
        hash,
        n,
        mood,
        used,
        usedAttrs,
        adaptive,
        false,
      );
    }
    if (chosen === null) break;
    used.add(chosen);
    usedAttrs.add(local[chosen].attribute);
    picked.push(chosen);
  }
  return picked;
}

function weightedGeneratedPick(
  local: GeneratedBankQuest[],
  hash: number,
  n: number,
  mood: WeatherMood,
  used: Set<number>,
  usedAttrs: Set<AttributeType>,
  adaptive: BoardAdaptive,
  enforceUniqueAttrs: boolean,
): number | null {
  let total = 0;
  const weights: number[] = [];
  for (let i = 0; i < local.length; i++) {
    if (
      used.has(i) ||
      (enforceUniqueAttrs && usedAttrs.has(local[i].attribute))
    ) {
      weights.push(0);
      continue;
    }
    const novelty = 0.55 + ((hash >> ((i + n) % 12)) % 50) / 100;
    const w = scoreCandidate(
      {
        difficulty: local[i].difficulty,
        attribute: local[i].attribute,
        setting: local[i].setting,
        goals: local[i].goals,
      },
      mood,
      adaptive,
      novelty,
    );
    weights.push(Math.max(0, w));
    total += Math.max(0, w);
  }
  if (total <= 0) return null;

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
  return chosen;
}

function parseGeneratedIndex(questId: string): number | null {
  const match = /^quest_\d{4}-\d{2}-\d{2}_g_(\d+)$/.exec(questId);
  if (!match) return null;
  return Number(match[1]);
}

/** Resolve today's board from saved overrides or fresh adaptive picks. */
export function resolveDailyBoard(
  dateStr: string,
  userId: string,
  mood: WeatherMood,
  extras: GeneratedBankQuest[],
  savedDate?: string | null,
  savedIds?: string[] | null,
  adaptive: BoardAdaptive = {},
): Quest[] {
  if (
    savedDate === dateStr &&
    Array.isArray(savedIds) &&
    savedIds.length === 3
  ) {
    const resolved = savedIds
      .map((id) => getQuestById(id, extras))
      .filter((q): q is Quest => q !== null);
    if (resolved.length === 3) return resolved;
  }
  return getDailyQuestsForUser(dateStr, userId, mood, extras, adaptive);
}

/**
 * Replacement quest after a skip/reroll — prefers easier + still on-goal.
 * Draws from the shared Gemini bank when available.
 */
export function pickRerollQuest(
  dateStr: string,
  userId: string,
  mood: WeatherMood,
  currentIds: string[],
  slotIndex: number,
  salt: number,
  adaptive: BoardAdaptive = {},
  extras: GeneratedBankQuest[] = [],
): Quest {
  const blockedAttributes = new Set<AttributeType>();
  const excludeGen = new Set<number>();
  const excludeCurated = new Set<number>();

  currentIds.forEach((id, i) => {
    const gIdx = parseGeneratedIndex(id);
    if (gIdx !== null) excludeGen.add(gIdx);
    const cIdx = parseBankIndex(id);
    if (cIdx !== null) excludeCurated.add(cIdx);
    if (i === slotIndex) return;
    const other = getQuestById(id, extras);
    if (other) blockedAttributes.add(other.attribute);
  });

  const eased: BoardAdaptive = {
    goalId: adaptive.goalId,
    difficulty: Math.max(
      1,
      (adaptive.difficulty ?? DEFAULT_QUEST_DIFFICULTY) - 0.6,
    ),
  };

  const local = extras.length > 0 ? extras : loadGeneratedQuests(dateStr);
  if (local.length >= 4) {
    const picked = pickFromGenerated(
      dateStr,
      `${userId}-reroll-${salt}`,
      mood,
      local,
      1,
      blockedAttributes,
      eased,
      excludeGen,
    );
    if (picked.length > 0) {
      return questFromGenerated(dateStr, picked[0], local[picked[0]]);
    }
  }

  const picked = pickQuestIndices(
    dateStr,
    userId,
    mood,
    1,
    excludeCurated,
    salt + slotIndex * 7 + 1,
    blockedAttributes,
    eased,
  );
  if (picked.length === 0) {
    for (let i = 0; i < MASTER_QUEST_BANK.length; i++) {
      if (!excludeCurated.has(i)) {
        return questFromBankIndex(dateStr, i);
      }
    }
    return questFromBankIndex(dateStr, 0);
  }
  return questFromBankIndex(dateStr, picked[0]);
}

/** Resolve a quest by id even if it is not in today's weather-biased set. */
export function getQuestById(
  questId: string,
  extras: GeneratedBankQuest[] = [],
): Quest | null {
  const gen = /^quest_(\d{4}-\d{2}-\d{2})_g_(\d+)$/.exec(questId);
  if (gen) {
    const dateStr = gen[1];
    const idx = Number(gen[2]);
    const local = extras.length > 0 ? extras : loadGeneratedQuests(dateStr);
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

export function difficultyOfQuestId(questId: string): number {
  const q = getQuestById(questId);
  return q?.difficulty ?? DEFAULT_QUEST_DIFFICULTY;
}

export function attributeOfBankIndex(bankIdx: number): AttributeType | null {
  return MASTER_QUEST_BANK[bankIdx]?.attribute ?? null;
}
