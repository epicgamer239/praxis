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
  orderBy,
  increment,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { UserProfile, Guild, PeerSubmission, AttributeType, LeaderboardEntry } from '@/types';
import {
  computeOverallLevelFromAttributes,
  formatLocalDate,
  getTitleForLevel,
} from '@/lib/progression';

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
  fieldNote: string;
}) {
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
    fieldNote: params.fieldNote,
    vouchesReceived: 0,
    requiredVouches: 2,
    vouchedBy: [],
    vouchedByNames: [],
    status: 'awaiting_vouches',
    createdAt: Timestamp.now(),
  };

  await setDoc(submissionRef, newSubmission);
}

// 5. Listen to Today's Submissions by Current User
export function subscribeToUserSubmissionsToday(
  userId: string,
  callback: (submissions: PeerSubmission[]) => void
) {
  const submissionsRef = collection(db, 'submissions');
  const q = query(
    submissionsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const list: PeerSubmission[] = [];
    snapshot.forEach((d) => list.push(d.data() as PeerSubmission));
    callback(list);
  });
}

// 6. Real-time Guild Submissions Feed
export function subscribeToGuildSubmissions(guildId: string, callback: (subs: PeerSubmission[]) => void) {
  const submissionsRef = collection(db, 'submissions');
  const q = query(
    submissionsRef,
    where('guildId', '==', guildId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const list: PeerSubmission[] = [];
    snapshot.forEach((d) => list.push(d.data() as PeerSubmission));
    callback(list);
  });
}

// 7. Anti-Cheat Vouch Action & Streak Calculation
export async function vouchForSubmission(
  submissionId: string,
  voucherId: string,
  voucherName: string
): Promise<boolean> {
  const subRef = doc(db, 'submissions', submissionId);
  const snap = await getDoc(subRef);

  if (!snap.exists()) return false;
  const sub = snap.data() as PeerSubmission;

  if (sub.userId === voucherId) {
    throw new Error('Self-vouching is prohibited.');
  }

  if (sub.vouchedBy.includes(voucherId)) {
    return false;
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
      const attr = author.attributes[sub.attribute];
      const newXp = attr.currentXp + sub.xpReward;
      const leveledUp = newXp >= attr.maxXp;
      const nextAttrXp = leveledUp ? newXp - attr.maxXp : newXp;
      const nextAttrLevel = leveledUp ? attr.level + 1 : attr.level;

      const today = formatLocalDate();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = formatLocalDate(yesterdayDate);

      let newStreak = author.streakDays || 0;
      if (author.lastActiveDate === today) {
        // Already counted today — keep streak
        newStreak = Math.max(newStreak, 1);
      } else if (author.lastActiveDate === yesterday) {
        newStreak = (newStreak || 0) + 1;
      } else {
        newStreak = 1;
      }

      const nextAttributes = {
        ...author.attributes,
        [sub.attribute]: {
          ...attr,
          currentXp: nextAttrXp,
          level: nextAttrLevel,
          verifiedCount: attr.verifiedCount + 1,
        },
      };
      const overallLevel = computeOverallLevelFromAttributes(nextAttributes);
      const overallTitle = getTitleForLevel(overallLevel);

      await updateDoc(authorRef, {
        [`attributes.${sub.attribute}.currentXp`]: nextAttrXp,
        [`attributes.${sub.attribute}.level`]: nextAttrLevel,
        [`attributes.${sub.attribute}.verifiedCount`]: increment(1),
        totalVerifiedDeeds: increment(1),
        streakDays: newStreak,
        lastActiveDate: today,
        activeDates: arrayUnion(today),
        level: overallLevel,
        title: overallTitle,
      });
    }
  }

  return true;
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
      const totalXp = Object.values(u.attributes).reduce(
        (sum, attr) => sum + (attr.level - 1) * 100 + attr.currentXp,
        0
      );

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
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const list: PeerSubmission[] = [];
    snapshot.forEach((d) => list.push(d.data() as PeerSubmission));
    callback(list);
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