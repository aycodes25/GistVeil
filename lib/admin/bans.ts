import type { BanRow } from './types';

export interface BansSummary {
  total: number;
  last30Days: number;
  /** Posts plus replies written by identities that are banned. */
  contentFromBanned: number;
  withReason: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// The four figures on the Bans page, counted from the real ban rows. `now` is a parameter so the
// page can pass the clock in and the function stays testable.
export function summarizeBans(bans: readonly BanRow[], now: number = Date.now()): BansSummary {
  return {
    total: bans.length,
    last30Days: bans.filter((ban) => now - new Date(ban.bannedAt).getTime() <= THIRTY_DAYS_MS).length,
    contentFromBanned: bans.reduce((sum, ban) => sum + ban.postCount + ban.adviceCount, 0),
    withReason: bans.filter((ban) => (ban.reason ?? '').trim() !== '').length,
  };
}
