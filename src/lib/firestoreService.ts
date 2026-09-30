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
import { UserProfile, Guild, PeerSubmission, AttributeType, LeaderboardEntry, Quest, GuildMemberProfile } from '@/types';
import {
  applyAttributeXp,
  formatLocalDate,
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
  getDailyQuestsForUser,
  pickRerollQuest,
  resolveDailyBoard,
} from '@/lib/questBank';
import { WeatherMood } from '@/lib/fieldConditions';
import { GeneratedBankQuest } from '@/lib/generatedQuests';
import { toMillis } from '@/lib/presence';

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
    requiredVouches: 2,
    vouchedBy: [],
    vouchedByNames: [],
    status: 'awaiting_vouches',
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

// 7. Anti-Cheat Vouch Action & Streak Calculation
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
  const updatedVoucherNames = [...sub.vouchedByNames, voucherName];
  const newVouchCount = updatedVouchers.length;
  const isNowVerified = newVouchCount >= sub.requiredVouches;

  await updateDoc(subRef, {
    attribute: sub.attribute,
    attributeLabel: sub.attributeLabel,
    vouchedBy: updatedVouchers,
    vouchedByNames: updatedVoucherNames,
    vouchesReceived: newVouchCount,
    status: isNowVerified ? 'verified' : 'awaiting_vouches',
    ...(isNowVerified ? { verifiedAt: Timestamp.now() } : {}),
  });

  if (isNowVerified) {
    const authorRef = doc(db, 'users', sub.userId);
    const authorSnap = await getDoc(authorRef);

    if (authorSnap.exists()) {
      const authorRaw = authorSnap.data() as UserProfile & {
        attributes?: Record<string, unknown>;
      };
      const author: UserProfile = {
        ...authorRaw,
        attributes: normalizeAttributes(authorRaw.attributes),
      };
      const gained = applyAttributeXp(author.attributes, sub.attribute, sub.xpReward, true);

      const today = formatLocalDate();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = formatLocalDate(yesterdayDate);

      let newStreak = author.streakDays || 0;
      if (author.lastActiveDate === today) {
        newStreak = Math.max(newStreak, 1);
      } else if (author.lastActiveDate === yesterday) {
        newStreak = (newStreak || 0) + 1;
      } else {
        newStreak = 1;
      }

      await updateDoc(authorRef, {
        attributes: gained.attributes,
        totalVerifiedDeeds: increment(1),
        streakDays: newStreak,
        lastActiveDate: today,
        activeDates: arrayUnion(today),
        level: gained.overallLevel,
        title: gained.title,
      });
    }
  }

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

/**
 * Swap one pending daily quest. Costs 1 weekly reroll.
 * Saves the full 3-slot board on first reroll of the day.
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

  const board = resolveDailyBoard(
    today,
    userId,
    mood,
    localQuests,
    profile.dailyQuestDate,
    profile.dailyQuestIds,
  );

  const current = board[slotIndex];
  if (!current) throw new Error('Quest slot missing.');
  if (lockedQuestIds.includes(current.id)) {
    throw new Error('That quest already has a submission.');
  }

  const currentIds = board.map((q) => q.id);
  const salt = WEEKLY_REROLLS - remaining + 1;
  const replacement = pickRerollQuest(
    today,
    userId,
    mood,
    currentIds,
    slotIndex,
    salt,
  );

  const nextIds = [...currentIds];
  nextIds[slotIndex] = replacement.id;
  remaining -= 1;

  await updateDoc(userRef, {
    dailyQuestDate: today,
    dailyQuestIds: nextIds,
    rerollWeekStart: weekStart,
    rerollsRemaining: remaining,
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
