import type { ActionResult } from './types';

// Bulk actions run the existing one-item server actions one after another. Each of those
// authenticates and validates for itself, so bulk adds no new way in; this only loops, caps the batch
// and reports what happened. Pure (no React, no server-only), so it is unit-tested.

export const BULK_MAX = 100;

export interface BulkOutcome {
  attempted: number;
  succeeded: number;
  failed: number;
  firstError?: string;
  /** More items were ticked than one batch allows; the rest were left alone. */
  capped: boolean;
}

export async function runBulk<T>(
  items: readonly T[],
  run: (item: T) => Promise<ActionResult>,
): Promise<BulkOutcome> {
  const batch = items.slice(0, BULK_MAX);
  let succeeded = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const item of batch) {
    try {
      const result = await run(item);
      if (result.ok) succeeded++;
      else {
        failed++;
        firstError ??= result.error;
      }
    } catch {
      failed++;
      firstError ??= 'Something went wrong.';
    }
  }

  return { attempted: batch.length, succeeded, failed, firstError, capped: items.length > BULK_MAX };
}

// "Hid 5 items." / "Hid 3 of 5 items. 2 failed." / "Hid 100 items. 30 more were left; run it again."
export function bulkMessage(outcome: BulkOutcome, pastTense: string): string {
  const noun = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`;
  const parts: string[] = [];
  if (outcome.failed === 0) parts.push(`${pastTense} ${noun(outcome.succeeded)}.`);
  else parts.push(`${pastTense} ${outcome.succeeded} of ${noun(outcome.attempted)}. ${outcome.failed} failed.`);
  if (outcome.capped) parts.push(`Only the first ${BULK_MAX} were processed; run it again for the rest.`);
  return parts.join(' ');
}
