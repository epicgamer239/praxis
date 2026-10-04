// src/lib/firestoreService.ts
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  increment,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { UserProfile, Guild, PeerSubmission, AttributeType, LeaderboardEntry, Quest, GuildMemberProfile, GoalId } from '@/types';
import {
  applyAttributeXp,
  computeOverallLevelFromAttributes,
  formatLocalDate,
  getTitleForLevel,
  getWeekStart,
  totalEarnedXp,
  VOUCH_BONUS_XP,
} from '@/lib/progression';
import { isNearDuplicate } from '@/lib/imageUtils';
import {
  normalizeAttributeKey,
  normalizeAttributes,
} from '@/lib/attributes';
import {
  WEEKLY_REROLLS,
  difficultyOfQuestId,
  getDailyQuestsForUser,
  pickRerollQuest,
  resolveDailyBoard,
} from '@/lib/questBank';
import {
  DEFAULT_QUEST_DIFFICULTY,
  difficultyAfterComplete,
  difficultyAfterSkip,
} from '@/lib/goals';
import { WeatherMood } from '@/lib/fieldConditions';
import {
  GeneratedBankQuest,
  placeCacheKey,
  validateGeneratedQuests,
} from '@/lib/generatedQuests';
import { persistSharedQuestBank } from '@/lib/questRuntime';
import { toMillis } from '@/lib/presence';
import {
  BASE_REQUIRED_VOUCHES,
  requiredVouchesFromNetwork,
} from '@/lib/vouchNetwork';

function normalizeSubmission(raw: Record<string, unknown>): PeerSubmission {
  const attribute = normalizeAttributeKey(raw.attribute as string);
  const labelMap: Record<AttributeType, string> = {
    neighborhood: 'Neighborhood',
    energy: 'Energy',
    social: 'Social',
    wisdom: 'Wisdom',
  };
  const legacyLabel = typeof raw.attributeLabel === 'string' ? raw.attributeLabel : '';
  const needsNewLabel =
    !legacyLabel ||
    /civic|vitality/i.test(legacyLabel) ||
    raw.attribute === 'civic' ||
    raw.attribute === 'vitality';

  return {
    ...(raw as unknown as PeerSubmission),
    attribute,
    attributeLabel: needsNewLabel ? labelMap[attribute] : legacyLabel,
  };
}

async function guildMemberCount(guildId: string): Promise<number> {
  const snap = await getDoc(doc(db, 'guilds', guildId));
  if (!snap.exists()) return 2;
  const ids = (snap.data() as Guild).memberIds;
  return Array.isArray(ids) ? ids.length : 2;
}

/** Recent verified deeds for an author — used by the large-guild vouch net. */
async function recentVerifiedVouchHistory(
  authorId: string,
  limit = 5,
): Promise<{ vouchedBy: string[] }[]> {
  const snap = await getDocs(
    query(
      collection(db, 'submissions'),
      where('userId', '==', authorId),
      where('status', '==', 'verified'),
    ),
  );
  const list = snap.docs.map((d) =>
    normalizeSubmission(d.data() as Record<string, unknown>),
  );
  list.sort(
    (a, b) =>
      submissionMillis(b.verifiedAt || b.createdAt) -
      submissionMillis(a.verifiedAt || a.createdAt),
  );
  return list.slice(0, limit).map((s) => ({ vouchedBy: s.vouchedBy || [] }));
}

async function resolveRequiredVouches(
  guildId: string,
  authorId: string,
  currentVouchers: string[] = [],
): Promise<number> {
  const memberCount = await guildMemberCount(guildId);
  const recentVerified = await recentVerifiedVouchHistory(authorId);
  return requiredVouchesFromNetwork({
    memberCount,
    recentVerified,
    currentVouchers,
  });
}

// 1. Join Guild by 5-character Code (or full Guild ID)
export async function joinGuildByCode(userId: string, codeOrId: string): Promise<Guild> {
  const clean = codeOrId.trim().toUpperCase();
  const guildsRef = collection(db, 'guilds');

  const qCode = query(guildsRef, where('inviteCode', '==', clean));
  const snap = await getDocs(qCode);

  if (!snap.empty) {
    const guildDoc = snap.docs[0];
    const guildData = guildDoc.data() as Guild;

    await updateDoc(doc(db, 'guilds', guildDoc.id), {
      memberIds: arrayUnion(userId),
    });

    await updateDoc(doc(db, 'users', userId), {
      guildId: guildDoc.id,
      guildName: guildData.name,
    });

    return guildData;
  }

  const directDoc = await getDoc(doc(db, 'guilds', codeOrId.trim()));
  if (directDoc.exists()) {
    const guildData = directDoc.data() as Guild;

    await updateDoc(doc(db, 'guilds', directDoc.id), {
      memberIds: arrayUnion(userId),
    });

    await updateDoc(doc(db, 'users', userId), {
      guildId: directDoc.id,
      guildName: guildData.name,
    });

    return guildData;
  }

  throw new Error('No guild found with that invite code.');
}

// 2. Create a New Guild
export async function createGuild(userId: string, guildName: string): Promise<Guild> {
  const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const guildId = `guild_${Date.now()}`;

  const newGuild: Guild = {
    id: guildId,
    name: guildName.trim(),
    inviteCode: randomCode,
    ownerId: userId,
    memberIds: [userId],
    createdAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'guilds', guildId), newGuild);

  await updateDoc(doc(db, 'users', userId), {
    guildId: guildId,
    guildName: guildName.trim(),
  });

  return newGuild;
}

// 3. Real-time Guild Data Listener
export function subscribeToGuild(guildId: string, callback: (guild: Guild | null) => void) {
  const guildRef = doc(db, 'guilds', guildId);
  return onSnapshot(guildRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as Guild);
    } else {
      callback(null);
    }
  });
}

// 4. Submit Proof of Work
export async function submitProofOfWork(params: {
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
}) {
  if (params.photoHash) {
    const duped = await guildHasNearDuplicate(params.guildId, params.photoHash);
    if (duped) {
      throw new Error("This photo was already used. Take a new one.");
    }
  }

  const submissionId = `sub_${Date.now()}`;
  const submissionRef = doc(db, 'submissions', submissionId);
  const requiredVouches = await resolveRequiredVouches(
    params.guildId,
    params.userId,
  );

  const newSubmission: PeerSubmission = {
    id: submissionId,
    userId: params.userId,
    authorName: params.authorName,
    guildId: params.guildId,
    questId: params.questId,
    questTitle: params.questTitle,
    attribute: params.attribute,
    attributeLabel: params.attributeLabel,
    xpReward: params.xpReward,
    photoBase64: params.photoBase64,
    photoHash: params.photoHash,
    fieldNote: params.fieldNote,
    vouchesReceived: 0,
    requiredVouches,
    vouchedBy: [],
    vouchedByNames: [],
    status: 'awaiting_vouches',
    rewardsClaimed: false,
    createdAt: Timestamp.now(),
  };

  await setDoc(submissionRef, newSubmission);

  if (params.photoHash) {
    await updateDoc(doc(db, 'users', params.userId), {
      photoHashes: arrayUnion(params.photoHash),
    });
  }
}

export async function guildHasNearDuplicate(guildId: string, hash: string) {
  const snap = await getDocs(query(collection(db, 'submissions'), where('guildId', '==', guildId)));
  for (const d of snap.docs) {
    const existing = (d.data() as PeerSubmission).photoHash;
    if (existing && isNearDuplicate(hash, existing)) return true;
  }
  return false;
}

// 5. Listen to Today's Submissions by Current User
function sortByCreatedAtDesc(list: PeerSubmission[]) {
  return list.sort((a, b) => {
    const aMs = submissionMillis(a.createdAt);
    const bMs = submissionMillis(b.createdAt);
    return bMs - aMs;
  });
}

function submissionMillis(raw: PeerSubmission['createdAt'] | undefined) {
  if (!raw) return 0;
  if (typeof raw === 'object' && raw && 'toMillis' in raw && typeof raw.toMillis === 'function') {
    return raw.toMillis();
  }
  if (typeof raw === 'object' && raw && 'seconds' in raw) {
    return Number(raw.seconds) * 1000;
  }
  const parsed = new Date(raw as string).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function subscribeToUserSubmissionsToday(
  userId: string,
  callback: (submissions: PeerSubmission[]) => void
) {
  const submissionsRef = collection(db, 'submissions');
  const q = query(submissionsRef, where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const list: PeerSubmission[] = [];
    snapshot.forEach((d) =>
      list.push(normalizeSubmission(d.data() as Record<string, unknown>)),
    );
    callback(sortByCreatedAtDesc(list));
  });
}

// 6. Real-time Guild Submissions Feed
export function subscribeToGuildSubmissions(guildId: string, callback: (subs: PeerSubmission[]) => void) {
  const submissionsRef = collection(db, 'submissions');
  const q = query(submissionsRef, where('guildId', '==', guildId));

  return onSnapshot(q, (snapshot) => {
    const list: PeerSubmission[] = [];
    snapshot.forEach((d) =>
      list.push(normalizeSubmission(d.data() as Record<string, unknown>)),
    );
    callback(sortByCreatedAtDesc(list));
  });
}

// 7. Anti-Cheat Vouch Action
// Author XP/streak are claimed by the author (self-write) — rules block cross-user profile updates.
export async function vouchForSubmission(
  submissionId: string,
  voucherId: string,
  voucherName: string
) {
  const subRef = doc(db, 'submissions', submissionId);
  const snap = await getDoc(subRef);

  if (!snap.exists()) {
    throw new Error('Submission is gone.');
  }
  const sub = normalizeSubmission(snap.data() as Record<string, unknown>);

  if (sub.userId === voucherId) {
    throw new Error('Self-vouching is prohibited.');
  }

  if (sub.vouchedBy.includes(voucherId)) {
    throw new Error('You already vouched for this.');
  }

  const updatedVouchers = [...sub.vouchedBy, voucherId];
  const updatedVoucherNames = [...(sub.vouchedByNames || []), voucherName];
  const newVouchCount = updatedVouchers.length;
  const requiredVouches = await resolveRequiredVouches(
    sub.guildId,
    sub.userId,
    updatedVouchers,
  );
  // Never drop below what the submission already asked for.
  const needed = Math.max(
    requiredVouches,
    sub.requiredVouches || BASE_REQUIRED_VOUCHES,
  );
  const isNowVerified = newVouchCount >= needed;

  await updateDoc(subRef, {
    requiredVouches: needed,
    vouchedBy: updatedVouchers,
    vouchedByNames: updatedVoucherNames,
    vouchesReceived: newVouchCount,
    status: isNowVerified ? 'verified' : 'awaiting_vouches',
    ...(isNowVerified
      ? { verifiedAt: Timestamp.now(), rewardsClaimed: false }
      : {}),
  });

  const voucherRef = doc(db, 'users', voucherId);
  const voucherSnap = await getDoc(voucherRef);
  if (voucherSnap.exists()) {
    const voucherRaw = voucherSnap.data() as UserProfile & {
      attributes?: Record<string, unknown>;
    };
    const voucher: UserProfile = {
      ...voucherRaw,
      attributes: normalizeAttributes(voucherRaw.attributes),
    };
    const bonus = applyAttributeXp(voucher.attributes, 'social', VOUCH_BONUS_XP);
    await updateDoc(voucherRef, {
      attributes: bonus.attributes,
      level: bonus.overallLevel,
      title: bonus.title,
      totalVouchesGiven: increment(1),
    });
  }

  return {
    verified: isNowVerified,
    bonusXp: VOUCH_BONUS_XP,
    authorName: sub.authorName,
    questTitle: sub.questTitle,
    xpReward: sub.xpReward,
    attributeLabel: sub.attributeLabel,
  };
}

/**
 * Finalize awaiting proofs that already meet their required vouch count
 * but never flipped to verified (interrupted write, etc.).
 */
export async function reconcileGuildVerifications(guildId: string): Promise<number> {
  const snap = await getDocs(
    query(collection(db, 'submissions'), where('guildId', '==', guildId)),
  );
  let fixed = 0;
  for (const d of snap.docs) {
    const sub = normalizeSubmission(d.data() as Record<string, unknown>);
    if (sub.status !== 'awaiting_vouches') continue;
    const needed = sub.requiredVouches || BASE_REQUIRED_VOUCHES;
    if ((sub.vouchesReceived || 0) < needed) continue;
    await updateDoc(d.ref, {
      status: 'verified',
      verifiedAt: Timestamp.now(),
      rewardsClaimed: false,
    });
    fixed += 1;
  }
  return fixed;
}

/** Author applies XP/streak for verified deeds (must run as the author). */
export async function claimPendingVerifiedRewards(userId: string): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, 'submissions'),
      where('userId', '==', userId),
      where('status', '==', 'verified'),
    ),
  );

  const all = snap.docs.map((d) => ({
    ref: d.ref,
    sub: normalizeSubmission(d.data() as Record<string, unknown>),
  }));
  const pending = all
    .filter(({ sub }) => !sub.rewardsClaimed)
    .sort(
      (a, b) =>
        submissionMillis(a.sub.verifiedAt || a.sub.createdAt) -
        submissionMillis(b.sub.verifiedAt || b.sub.createdAt),
    );

  const authorRef = doc(db, 'users', userId);
  const authorSnap = await getDoc(authorRef);
  if (!authorSnap.exists()) return 0;

  const authorRaw = authorSnap.data() as UserProfile & {
    attributes?: Record<string, unknown>;
  };
  let attributes = normalizeAttributes(authorRaw.attributes);
  let streakDays = authorRaw.streakDays || 0;
  let lastActiveDate = authorRaw.lastActiveDate || '';
  let questDifficulty = authorRaw.questDifficulty ?? DEFAULT_QUEST_DIFFICULTY;
  const activeDates = new Set(authorRaw.activeDates || []);

  for (const { ref, sub } of pending) {
    const gained = applyAttributeXp(attributes, sub.attribute, sub.xpReward, true);
    attributes = gained.attributes;

    const when = new Date(
      submissionMillis(sub.verifiedAt || sub.createdAt) || Date.now(),
    );
    const day = formatLocalDate(when);
    const yesterdayDate = new Date(when);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = formatLocalDate(yesterdayDate);

    if (lastActiveDate === day) {
      streakDays = Math.max(streakDays, 1);
    } else if (lastActiveDate === yesterday) {
      streakDays = (streakDays || 0) + 1;
    } else {
      streakDays = 1;
    }
    lastActiveDate = day;
    activeDates.add(day);

    questDifficulty = difficultyAfterComplete(
      questDifficulty,
      difficultyOfQuestId(sub.questId),
    );

    await updateDoc(ref, { rewardsClaimed: true });
  }

  const verifiedCount = all.length;
  if (pending.length > 0) {
    const level = computeOverallLevelFromAttributes(attributes);
    await updateDoc(authorRef, {
      attributes,
      totalVerifiedDeeds: verifiedCount,
      streakDays,
      lastActiveDate,
      activeDates: Array.from(activeDates),
      level,
      title: getTitleForLevel(level),
      questDifficulty,
    });
  } else if ((authorRaw.totalVerifiedDeeds || 0) !== verifiedCount) {
    await updateDoc(authorRef, { totalVerifiedDeeds: verifiedCount });
  }

  return pending.length;
}

// 8. Live Guild Roster Listener
export function subscribeToGuildMembers(
  memberIds: string[],
  currentUserId: string,
  callback: (entries: GuildMemberProfile[]) => void
) {
  if (!memberIds || memberIds.length === 0) {
    callback([]);
    return () => {};
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('id', 'in', memberIds.slice(0, 10)));

  return onSnapshot(q, (snapshot) => {
    const list: GuildMemberProfile[] = [];

    snapshot.forEach((d) => {
      const uRaw = d.data() as UserProfile & {
        attributes?: Record<string, unknown>;
      };
      const attributes = normalizeAttributes(uRaw.attributes);
      const totalXp = totalEarnedXp(attributes);

      list.push({
        userId: uRaw.id,
        name: uRaw.name,
        title: uRaw.title || `Level ${uRaw.level || 1}`,
        level: uRaw.level || 1,
        streakDays: uRaw.streakDays || 0,
        totalVerifiedDeeds: uRaw.totalVerifiedDeeds || 0,
        totalVouchesGiven: uRaw.totalVouchesGiven || 0,
        totalXp,
        lastSeenAtMs: toMillis(uRaw.lastSeenAt),
        isCurrentUser: uRaw.id === currentUserId,
      });
    });

    list.sort(
      (a, b) =>
        b.totalVerifiedDeeds - a.totalVerifiedDeeds || b.totalXp - a.totalXp,
    );

    callback(list);
  });
}

export function membersToLeaderboard(
  members: GuildMemberProfile[],
): LeaderboardEntry[] {
  return members.map((m, idx) => ({
    rank: idx + 1,
    userId: m.userId,
    name: m.name,
    isCurrentUser: m.isCurrentUser,
    deedsCount: m.totalVerifiedDeeds,
    totalXp: m.totalXp,
  }));
}

/** Heartbeat for online presence. */
export async function touchLastSeen(userId: string) {
  await updateDoc(doc(db, 'users', userId), {
    lastSeenAt: Timestamp.now(),
  });
}

/** Keep profile.totalVerifiedDeeds aligned with the verified submissions feed. */
export async function syncVerifiedDeedCount(userId: string, count: number) {
  if (count < 0) return;
  await updateDoc(doc(db, 'users', userId), {
    totalVerifiedDeeds: count,
  });
}

// 9. Live User Verified Deeds History Listener
export function subscribeToUserVerifiedDeeds(
  userId: string,
  callback: (deeds: PeerSubmission[]) => void
) {
  const submissionsRef = collection(db, 'submissions');
  const q = query(
    submissionsRef,
    where('userId', '==', userId),
    where('status', '==', 'verified'),
  );

  return onSnapshot(q, (snapshot) => {
    const list: PeerSubmission[] = [];
    snapshot.forEach((d) =>
      list.push(normalizeSubmission(d.data() as Record<string, unknown>)),
    );
    callback(sortByCreatedAtDesc(list));
  });
}

// 10. Send a Social Nudge to a Guild Member
export async function sendNudgeToMember(targetUserId: string, nudgerName: string) {
  const targetUserRef = doc(db, 'users', targetUserId);
  await updateDoc(targetUserRef, {
    nudgedByNames: arrayUnion(nudgerName),
  });
}

// 11. Clear Nudges for Current User
export async function clearUserNudges(userId: string) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    nudgedByNames: [],
  });
}

/** Reset weekly reroll budget when the Monday key rolls over. */
export async function ensureRerollBudget(userId: string, profile: UserProfile) {
  const weekStart = formatLocalDate(getWeekStart());
  if (
    profile.rerollWeekStart === weekStart &&
    typeof profile.rerollsRemaining === 'number'
  ) {
    return;
  }
  await updateDoc(doc(db, 'users', userId), {
    rerollWeekStart: weekStart,
    rerollsRemaining: WEEKLY_REROLLS,
  });
}

/** Persist primary goal and reset adaptive band for a fresh start on that path. */
export async function saveUserGoal(userId: string, goalId: GoalId) {
  await updateDoc(doc(db, 'users', userId), {
    goalId,
    questDifficulty: DEFAULT_QUEST_DIFFICULTY,
    // Clear today's board so the next load adapts to the new goal.
    dailyQuestDate: '',
    dailyQuestIds: [],
  });
}

/**
 * Swap one pending daily quest. Costs 1 weekly reroll.
 * Eases the difficulty band and picks an easier on-goal replacement.
 */
export async function rerollDailyQuestSlot(opts: {
  userId: string;
  slotIndex: number;
  mood: WeatherMood;
  localQuests?: GeneratedBankQuest[];
  lockedQuestIds: string[];
}): Promise<{ questIds: string[]; remaining: number; replacement: Quest }> {
  const { userId, slotIndex, mood, localQuests = [], lockedQuestIds } = opts;
  if (slotIndex < 0 || slotIndex > 2) {
    throw new Error('Invalid quest slot.');
  }

  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Profile not found.');

  const profile = snap.data() as UserProfile;
  const today = formatLocalDate();
  const weekStart = formatLocalDate(getWeekStart());

  let remaining =
    profile.rerollWeekStart === weekStart
      ? (profile.rerollsRemaining ?? WEEKLY_REROLLS)
      : WEEKLY_REROLLS;

  if (remaining <= 0) {
    throw new Error('No rerolls left this week.');
  }

  const adaptive = {
    goalId: profile.goalId,
    difficulty: profile.questDifficulty ?? DEFAULT_QUEST_DIFFICULTY,
  };

  const board = resolveDailyBoard(
    today,
    userId,
    mood,
    localQuests,
    profile.dailyQuestDate,
    profile.dailyQuestIds,
    adaptive,
  );

  const current = board[slotIndex];
  if (!current) throw new Error('Quest slot missing.');
  if (lockedQuestIds.includes(current.id)) {
    throw new Error('That quest already has a submission.');
  }

  const eased = difficultyAfterSkip(adaptive.difficulty);
  const currentIds = board.map((q) => q.id);
  const salt = WEEKLY_REROLLS - remaining + 1;
  const replacement = pickRerollQuest(
    today,
    userId,
    mood,
    currentIds,
    slotIndex,
    salt,
    { goalId: adaptive.goalId, difficulty: eased },
    localQuests,
  );

  const nextIds = [...currentIds];
  nextIds[slotIndex] = replacement.id;
  remaining -= 1;

  await updateDoc(userRef, {
    dailyQuestDate: today,
    dailyQuestIds: nextIds,
    rerollWeekStart: weekStart,
    rerollsRemaining: remaining,
    questDifficulty: eased,
  });

  return { questIds: nextIds, remaining, replacement };
}

/** Fresh per-user board helper for callers that need ids without overrides. */
export function previewDailyQuestIds(
  dateStr: string,
  userId: string,
  mood: WeatherMood,
  localQuests: GeneratedBankQuest[] = [],
): string[] {
  return getDailyQuestsForUser(dateStr, userId, mood, localQuests).map((q) => q.id);
}

type SharedBankDoc = {
  cacheId: string;
  dateStr: string;
  place: string;
  mood: WeatherMood;
  quests: GeneratedBankQuest[];
  source: string;
  createdAtMs: number;
};

/**
 * Load or create the shared Gemini quest bank for this place/day/weather.
 * Friends in the same conditions draw from the same pool; our picker chooses
 * each person's 3 adaptively.
 */
export async function ensureSharedQuestBank(opts: {
  place: string;
  dateStr: string;
  mood: WeatherMood;
  weatherLabel: string;
  airLabel: string;
}): Promise<{ quests: GeneratedBankQuest[]; source: string; cacheId: string }> {
  const { place, dateStr, mood, weatherLabel, airLabel } = opts;
  const cacheId = placeCacheKey(place, dateStr, mood);
  const ref = doc(db, 'questBanks', cacheId);

  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data() as SharedBankDoc;
    const quests = validateGeneratedQuests(data.quests || []);
    if (quests.length >= 4) {
      persistSharedQuestBank({ cacheId, dateStr, place, mood, quests });
      return { quests, source: 'shared', cacheId };
    }
  }

  const params = new URLSearchParams({
    place,
    date: dateStr,
    mood,
    weather: weatherLabel,
    air: airLabel,
  });
  const res = await fetch(`/api/quests/generate?${params}`);
  const payload = (await res.json()) as {
    quests?: GeneratedBankQuest[];
    source?: string;
  };
  const quests = validateGeneratedQuests(payload.quests || []);
  if (quests.length < 4) {
    return {
      quests: [],
      source: payload.source || 'empty',
      cacheId,
    };
  }

  // First writer wins — if another client created it while we generated, use theirs.
  const raced = await getDoc(ref);
  if (raced.exists()) {
    const data = raced.data() as SharedBankDoc;
    const shared = validateGeneratedQuests(data.quests || []);
    if (shared.length >= 4) {
      persistSharedQuestBank({
        cacheId,
        dateStr,
        place,
        mood,
        quests: shared,
      });
      return { quests: shared, source: 'shared', cacheId };
    }
  }

  try {
    await setDoc(ref, {
      cacheId,
      dateStr,
      place,
      mood,
      quests,
      source: payload.source || 'gemini',
      createdAtMs: Date.now(),
    } satisfies SharedBankDoc);
  } catch {
    const after = await getDoc(ref);
    if (after.exists()) {
      const data = after.data() as SharedBankDoc;
      const shared = Array.isArray(data.quests) ? data.quests : quests;
      persistSharedQuestBank({
        cacheId,
        dateStr,
        place,
        mood,
        quests: shared,
      });
      return { quests: shared, source: 'shared', cacheId };
    }
  }

  persistSharedQuestBank({ cacheId, dateStr, place, mood, quests });
  return { quests, source: payload.source || 'gemini', cacheId };
}
