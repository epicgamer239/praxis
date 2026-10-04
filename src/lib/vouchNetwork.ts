// src/lib/vouchNetwork.ts
/**
 * Vouch thresholds + large-guild anti-collusion.
 *
 * Base: always 2 peer vouches.
 * Guilds with >10 members: if the same people keep sealing an author's
 * deeds, raise the bar to 3 so a tight pair can't rubber-stamp forever.
 */

export const BASE_REQUIRED_VOUCHES = 2;
export const ELEVATED_REQUIRED_VOUCHES = 3;
export const LARGE_GUILD_MEMBER_THRESHOLD = 10;
/** Look at this many recent verified deeds per author. */
const HISTORY_WINDOW = 3;
/** Appear on this many of those deeds → treated as a concentrated voucher. */
const CONCENTRATION_HITS = 2;

export type VouchHistoryItem = {
  vouchedBy: string[];
};

/** Voucher ids that show up on ≥2 of the author's last few verified deeds. */
export function concentratedVoucherIds(
  recentVerified: VouchHistoryItem[],
): Set<string> {
  const window = recentVerified.slice(0, HISTORY_WINDOW);
  const counts = new Map<string, number>();
  for (const item of window) {
    const seen = new Set(item.vouchedBy || []);
    for (const id of seen) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  const out = new Set<string>();
  for (const [id, n] of counts) {
    if (n >= CONCENTRATION_HITS) out.add(id);
  }
  return out;
}

/**
 * How many distinct peer vouches this submission needs right now.
 * `currentVouchers` lets us bump mid-flight when a clique is sealing again.
 */
export function requiredVouchesFromNetwork(opts: {
  memberCount: number;
  recentVerified: VouchHistoryItem[];
  currentVouchers?: string[];
}): number {
  let required = BASE_REQUIRED_VOUCHES;
  if (opts.memberCount <= LARGE_GUILD_MEMBER_THRESHOLD) {
    return required;
  }

  const concentrated = concentratedVoucherIds(opts.recentVerified);

  // History already shows a repeat rubber-stamp pattern → start higher.
  if (concentrated.size > 0 && opts.recentVerified.length >= 2) {
    required = ELEVATED_REQUIRED_VOUCHES;
  }

  const current = opts.currentVouchers || [];
  // All vouchers so far are from the concentrated set → need a fresh peer.
  if (
    current.length >= BASE_REQUIRED_VOUCHES &&
    current.every((id) => concentrated.has(id))
  ) {
    required = Math.max(required, ELEVATED_REQUIRED_VOUCHES);
  }

  return required;
}
