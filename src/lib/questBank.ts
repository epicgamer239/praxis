// src/lib/questBank.ts
import { Quest, AttributeType } from '@/types';
import { DEED_XP } from '@/lib/progression';

export const MASTER_QUEST_BANK: Omit<Quest, 'id'>[] = [
  // Social (Charisma)
  {
    title: 'Ask a local barista, cashier, or clerk for their personal favorite recommendation',
    description: 'Order or discuss their choice. Complete this interaction face-to-face with zero digital screens.',
    attribute: 'social',
    attributeLabel: 'Social interaction',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the item, storefront, or receipt with a note on the conversation.',
  },
  {
    title: 'Give a genuine, unexpected compliment to someone you do not normally speak with',
    description: 'Notice something specific (e.g., their work, craft, or effort) and express authentic appreciation in person.',
    attribute: 'social',
    attributeLabel: 'Social interaction',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your location or activity with a brief field note on the interaction.',
  },
  {
    title: 'Introduce yourself to a neighbor, peer, or local artisan you have never spoken to',
    description: 'Break the everyday ice with a simple greeting and brief conversation.',
    attribute: 'social',
    attributeLabel: 'Social interaction',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the area where you met with a note detailing the discussion.',
  },

  // Civic (Reputation)
  {
    title: 'Pick up and properly dispose of three pieces of litter along your commute or route',
    description: 'Leave a local trail, sidewalk, or community park visibly cleaner than you found it.',
    attribute: 'civic',
    attributeLabel: 'Civic action',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the collected litter in or beside a public trash/recycling bin.',
  },
  {
    title: 'Support an independent, locally owned non-chain shop in your community',
    description: 'Visit a family-owned grocery, independent bookstore, or neighborhood hardware store.',
    attribute: 'civic',
    attributeLabel: 'Civic action',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the local storefront or purchase item.',
  },
  {
    title: 'Return 2 misplaced shopping carts or clean up an abandoned item in a public area',
    description: 'Perform a low-friction civic deed that restores order to a shared space.',
    attribute: 'civic',
    attributeLabel: 'Civic action',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the returned cart bay or tidy public space.',
  },

  // Vitality (Physical Movement & Exploration)
  {
    title: 'Walk 4,000 steps without checking your mobile device once',
    description: 'Keep your phone pocketed or in "Do Not Disturb" mode for the entire duration of the walk.',
    attribute: 'vitality',
    attributeLabel: 'Vitality & movement',
    xpReward: DEED_XP,
    requiredProof: 'Photo of a trail landmark, scenic path, or your step counter summary.',
  },
  {
    title: 'Explore a street, park trail, or neighborhood path you have never set foot on before',
    description: 'Intentionally alter your regular route to map new physical terrain in your town.',
    attribute: 'vitality',
    attributeLabel: 'Vitality & movement',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the newly discovered landmark or trail marker.',
  },
  {
    title: 'Engage in 20 minutes of continuous bodyweight movement or physical outdoor labor',
    description: 'Yard work, stretching, calisthenics, or cycling without headphones or podcasts.',
    attribute: 'vitality',
    attributeLabel: 'Vitality & movement',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your training environment or outdoor area.',
  },

  // Wisdom (Mindfulness & Focus)
  {
    title: 'Spend 20 continuous minutes reading physical paper (book, article, or journal)',
    description: 'No e-readers, iPads, or phone screens. Pure analog reading in a quiet space.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom & mindfulness',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the open book and your analog reading space.',
  },
  {
    title: 'Plan your entire day or reflect on a recent decision using pen and paper only',
    description: '15 minutes of uninterrupted analog thought with all electronic devices in another room.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom & mindfulness',
    xpReward: DEED_XP,
    requiredProof: 'Photo of your handwritten notes or planning notebook.',
  },
  {
    title: 'Sit in complete silence outdoors for 10 continuous minutes with zero digital input',
    description: 'Observe surroundings, soundscapes, and breath without reaching for your device.',
    attribute: 'wisdom',
    attributeLabel: 'Wisdom & mindfulness',
    xpReward: DEED_XP,
    requiredProof: 'Photo of the outdoor seating location.',
  },
];

// Simple deterministic hash for consistent daily selection across guild members
function getDayHash(dateStr: string, seed: string): number {
  let hash = 0;
  const combined = `${dateStr}-${seed}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns 3 identical daily quests for a given date and guild code.
 */
export function getDailyQuestsForGuild(dateStr: string, guildCode = 'DEFAULT'): Quest[] {
  const hash = getDayHash(dateStr, guildCode);
  const total = MASTER_QUEST_BANK.length;

  const idx1 = hash % total;
  const idx2 = (hash + 4) % total;
  const idx3 = (hash + 8) % total;

  const selectedIndices = [idx1, idx2 === idx1 ? (idx2 + 1) % total : idx2];
  const thirdIdx = idx3 === idx1 || idx3 === selectedIndices[1] ? (idx3 + 2) % total : idx3;
  selectedIndices.push(thirdIdx);

  return selectedIndices.map((bankIdx, position) => ({
    id: `quest_${dateStr}_${position}`,
    ...MASTER_QUEST_BANK[bankIdx],
    dateKey: dateStr,
  }));
}