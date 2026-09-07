// src/lib/mockData.ts
import { UserProfile, Quest, PeerSubmission, LeaderboardEntry } from '@/types';

export const currentUser: UserProfile = {
  id: 'usr_alexander',
  email: 'alexander@example.com',
  name: 'Alexander Wright',
  title: 'Level 4 Real-World Adventurer',
  guildName: 'Oak & Iron Guild',
  guildId: '7X9K2',
  level: 4,
  streakDays: 4,
  lastActiveDate: '2026-08-26',
  totalVerifiedDeeds: 18,
  attributes: {
    wisdom: { level: 2, currentXp: 85, maxXp: 150, verifiedCount: 2 },
    social: { level: 3, currentXp: 140, maxXp: 200, verifiedCount: 6 },
    civic: { level: 4, currentXp: 190, maxXp: 250, verifiedCount: 7 },
    vitality: { level: 2, currentXp: 60, maxXp: 150, verifiedCount: 3 },
  },
};

export const initialQuests: Quest[] = [
  {
    id: 'q_1',
    title: 'Ask a local barista or clerk for their personal favorite item',
    description: 'Order their recommendation or discuss their menu choices. Complete this interaction face-to-face.',
    attribute: 'social',
    attributeLabel: 'Social interaction',
    xpReward: 25,
    requiredProof: 'Photo of your drink, food, or storefront with a conversational field note.',
    status: 'pending',
  },
  {
    id: 'q_2',
    title: 'Walk 4,000 steps without checking your mobile device',
    description: 'Photo evidence submitted to Oak & Iron war room. Points will unlock your next Vitality tier upon 1 more peer vouch.',
    attribute: 'vitality',
    attributeLabel: 'Vitality & movement',
    xpReward: 20,
    requiredProof: 'Step counter snapshot or outdoor trail landmark.',
    status: 'awaiting_vouches',
    vouchesReceived: 1,
    requiredVouches: 2,
    vouchedBy: ['usr_elena'],
  },
  {
    id: 'q_3',
    title: 'Pick up three pieces of litter along your regular route',
    description: 'Vouched by Marcus Vance and Chloe Simmons.',
    attribute: 'civic',
    attributeLabel: 'Civic action',
    xpReward: 35,
    requiredProof: 'Photo of litter in public receptacle.',
    status: 'verified',
    vouchesReceived: 2,
    requiredVouches: 2,
    vouchedBy: ['usr_marcus', 'usr_chloe'],
  },
];

export const peerSubmissions: PeerSubmission[] = [
  {
    id: 'sub_rowan_1',
    userId: 'usr_rowan',
    authorName: 'Rowan Miller',
    guildId: '7X9K2',
    questId: 'q_3',
    questTitle: 'Pick up three pieces of litter along your route',
    attribute: 'civic',
    attributeLabel: 'Civic action',
    xpReward: 35,
    photoBase64: '',
    fieldNote: 'Cleaned up the trailhead near the community park during my run.',
    vouchesReceived: 1,
    requiredVouches: 2,
    vouchedBy: ['usr_elena'],
    vouchedByNames: ['Elena Rostova'],
    status: 'awaiting_vouches',
    createdAt: new Date().toISOString(),
  },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, userId: 'usr_rowan', name: 'Rowan Miller', isCurrentUser: false, deedsCount: 6, totalXp: 185 },
  { rank: 2, userId: 'usr_alexander', name: 'Alexander Wright (You)', isCurrentUser: true, deedsCount: 5, totalXp: 160 },
  { rank: 3, userId: 'usr_elena', name: 'Elena Rostova', isCurrentUser: false, deedsCount: 4, totalXp: 120 },
  { rank: 4, userId: 'usr_marcus', name: 'Marcus Vance', isCurrentUser: false, deedsCount: 4, totalXp: 110 },
];