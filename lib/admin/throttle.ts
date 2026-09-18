// Pure login-throttle rules. The attempts table itself is accessed from loginAttempts.ts
// (server-only); keeping the rules here means they can be unit-tested under plain Node.

export const MAX_FAILURES = 5;

const WINDOW_MS = 15 * 60 * 1000;
const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;

export function isThrottled(recentFailureCount: number): boolean {
  return recentFailureCount >= MAX_FAILURES;
}

// Failures newer than this timestamp count toward the limit.
export function windowStartIso(nowMs: number): string {
  return new Date(nowMs - WINDOW_MS).toISOString();
}

// Attempt rows older than this timestamp are deleted.
export function pruneBeforeIso(nowMs: number): string {
  return new Date(nowMs - PRUNE_AFTER_MS).toISOString();
}

// First x-forwarded-for entry (Vercel sets it), or "unknown" when absent or blank.
export function clientIp(forwardedFor: string | null | undefined): string {
  const first = forwardedFor?.split(',')[0]?.trim();
  return first ? first : 'unknown';
}
