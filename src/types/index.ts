// src/types/index.ts

/** Compass attributes: N Neighborhood, E Energy, S Social, W Wisdom */
export type AttributeType = 'neighborhood' | 'energy' | 'social' | 'wisdom';

/** Primary focus that drives adaptive quest selection. */
export type GoalId = 'balanced' | 'confidence' | 'service';

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
  /** Times this user has vouched for a guildmate's proof. */
  totalVouchesGiven?: number;
  nudgedByNames?: string[]; // Friends who pinged the user
  photoHashes?: string[];
  attributes: Record<AttributeType, AttributeStat>;
  /** Chosen focus for adaptive quests. */
  goalId?: GoalId | null;
  /** Adaptive difficulty band 1–5 (eases on skip, rises on complete). */
  questDifficulty?: number;
  /** Monday YYYY-MM-DD for the current reroll week. */
  rerollWeekStart?: string;
  /** Rerolls left in the current week (max 3). */
  rerollsRemaining?: number;
  /** Local date the saved daily board belongs to. */
  dailyQuestDate?: string;
  /** Three quest ids for today's board after any rerolls. */
  dailyQuestIds?: string[];
  /** Last app heartbeat (Firestore Timestamp or millis). */
  lastSeenAt?: unknown;
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
  /** Challenge band 1–5 when from the curated graph. */
  difficulty?: number;
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
  photoHash?: string;
  fieldNote: string;
  vouchesReceived: number;
  requiredVouches: number;
  vouchedBy: string[];
  vouchedByNames: string[];
  status: 'awaiting_vouches' | 'verified';
  createdAt: any;
  verifiedAt?: any;
  /** Author self-claimed XP/streak after verification (rules block cross-user writes). */
  rewardsClaimed?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  isCurrentUser: boolean;
  deedsCount: number;
  totalXp: number;
}

/** Rich guild roster row for clan-style member cards. */
export interface GuildMemberProfile {
  userId: string;
  name: string;
  title: string;
  level: number;
  streakDays: number;
  totalVerifiedDeeds: number;
  totalVouchesGiven: number;
  totalXp: number;
  lastSeenAtMs: number | null;
  isCurrentUser: boolean;
}

export interface GuildActivityItem {
  id: string;
  atMs: number;
  kind: 'submitted' | 'verified';
  text: string;
  href?: string;
}
