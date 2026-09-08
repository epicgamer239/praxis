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
import { UserProfile, Guild, PeerSubmission, AttributeType, LeaderboardEntry } from '@/types';
import {
  applyAttributeXp,
  formatLocalDate,
  totalEarnedXp,
  VOUCH_BONUS_XP,
} from '@/lib/progression';
import { isNearDuplicate } from '@/lib/imageUtils';

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
    snapshot.forEach((d) => list.push(d.data() as PeerSubmission));
    callback(sortByCreatedAtDesc(list));
  });
}

// 6. Real-time Guild Submissions Feed
export function subscribeToGuildSubmissions(guildId: string, callback: (subs: PeerSubmission[]) => void) {
  const submissionsRef = collection(db, 'submissions');
  const q = query(submissionsRef, where('guildId', '==', guildId));

  return onSnapshot(q, (snapshot) => {
    const list: PeerSubmission[] = [];
    snapshot.forEach((d) => list.push(d.data() as PeerSubmission));
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
  const sub = snap.data() as PeerSubmission;

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
      const author = authorSnap.data() as UserProfile;
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

      const nextAttr = gained.attributes[sub.attribute];
      await updateDoc(authorRef, {
        [`attributes.${sub.attribute}.currentXp`]: nextAttr.currentXp,
        [`attributes.${sub.attribute}.level`]: nextAttr.level,
        [`attributes.${sub.attribute}.maxXp`]: nextAttr.maxXp,
        [`attributes.${sub.attribute}.verifiedCount`]: increment(1),
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
    const voucher = voucherSnap.data() as UserProfile;
    const bonus = applyAttributeXp(voucher.attributes, 'social', VOUCH_BONUS_XP);
    await updateDoc(voucherRef, {
      'attributes.social.currentXp': bonus.attributes.social.currentXp,
      'attributes.social.level': bonus.attributes.social.level,
      'attributes.social.maxXp': bonus.attributes.social.maxXp,
      level: bonus.overallLevel,
      title: bonus.title,
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

// 8. Live Guild Standings Leaderboard Listener
export function subscribeToGuildMembers(
  memberIds: string[],
  currentUserId: string,
  callback: (entries: LeaderboardEntry[]) => void
) {
  if (!memberIds || memberIds.length === 0) {
    callback([]);
    return () => {};
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('id', 'in', memberIds.slice(0, 10)));

  return onSnapshot(q, (snapshot) => {
    const list: LeaderboardEntry[] = [];

    snapshot.forEach((d) => {
      const u = d.data() as UserProfile;
      const totalXp = totalEarnedXp(u.attributes);

      list.push({
        rank: 0,
        userId: u.id,
        name: u.name,
        isCurrentUser: u.id === currentUserId,
        deedsCount: u.totalVerifiedDeeds || 0,
        totalXp: totalXp,
      });
    });

    list.sort((a, b) => b.deedsCount - a.deedsCount || b.totalXp - a.totalXp);
    list.forEach((item, idx) => (item.rank = idx + 1));

    callback(list);
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
    snapshot.forEach((d) => list.push(d.data() as PeerSubmission));
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