// src/types/index.ts

export type AttributeType = 'wisdom' | 'social' | 'civic' | 'vitality';

export interface AttributeStat {
  level: number;
  currentXp: number;
  maxXp: number;
  verifiedCount: number;
}

export interface UserProfile {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  title: string;
  guildId: string | null;
  guildName: string | null;
  level: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  /** Calendar days (YYYY-MM-DD) with at least one verified deed. */
  activeDates?: string[];
  totalVerifiedDeeds: number;
  nudgedByNames?: string[]; // Friends who pinged the user
  attributes: Record<AttributeType, AttributeStat>;
}

export interface Guild {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberIds: string[];
  createdAt: any;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  attribute: AttributeType;
  attributeLabel: string;
  xpReward: number;
  requiredProof: string;
  dateKey?: string;
  status?: 'pending' | 'awaiting_vouches' | 'verified';
  vouchesReceived?: number;
  requiredVouches?: number;
  vouchedBy?: string[];
  fieldNote?: string;
}

export interface PeerSubmission {
  id: string;
  userId: string;
  authorName: string;
  guildId: string;
  questId: string;
  questTitle: string;
  attribute: AttributeType;
  attributeLabel: string;
  xpReward: number;
  photoBase64: string;
  fieldNote: string;
  vouchesReceived: number;
  requiredVouches: number;
  vouchedBy: string[];
  vouchedByNames: string[];
  status: 'awaiting_vouches' | 'verified';
  createdAt: any;
  verifiedAt?: any;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  isCurrentUser: boolean;
  deedsCount: number;
  totalXp: number;
}