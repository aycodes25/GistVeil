import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BULK_MAX, bulkMessage, runBulk } from './bulk';

const ok = async () => ({ ok: true as const });

describe('runBulk', () => {
  test('runs every item and counts the successes', async () => {
    const seen: number[] = [];
    const outcome = await runBulk([1, 2, 3], async (n) => {
      seen.push(n);
      return { ok: true };
    });
    assert.deepEqual(seen, [1, 2, 3]);
    assert.deepEqual(outcome, { attempted: 3, succeeded: 3, failed: 0, firstError: undefined, capped: false });
  });

  test('runs one at a time, in order', async () => {
    let running = 0;
    let peak = 0;
    await runBulk([1, 2, 3, 4], async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 2));
      running--;
      return { ok: true };
    });
    assert.equal(peak, 1);
  });

  test('a failure is counted and does not stop the rest; the first error is kept', async () => {
    const outcome = await runBulk([1, 2, 3, 4], async (n) =>
      n % 2 === 0 ? { ok: false, error: `bad ${n}` } : { ok: true },
    );
    assert.equal(outcome.succeeded, 2);
    assert.equal(outcome.failed, 2);
    assert.equal(outcome.firstError, 'bad 2');
  });

  test('a thrown error counts as a failure instead of aborting the batch', async () => {
    const outcome = await runBulk([1, 2, 3], async (n) => {
      if (n === 2) throw new Error('network');
      return { ok: true };
    });
    assert.equal(outcome.succeeded, 2);
    assert.equal(outcome.failed, 1);
    assert.equal(outcome.firstError, 'Something went wrong.');
  });

  test(`only the first ${BULK_MAX} are processed, and it says so`, async () => {
    const items = Array.from({ length: BULK_MAX + 30 }, (_, i) => i);
    let calls = 0;
    const outcome = await runBulk(items, async () => {
      calls++;
      return { ok: true };
    });
    assert.equal(calls, BULK_MAX);
    assert.equal(outcome.attempted, BULK_MAX);
    assert.equal(outcome.capped, true);
  });

  test('an empty selection does nothing', async () => {
    const outcome = await runBulk([], ok);
    assert.deepEqual(outcome, { attempted: 0, succeeded: 0, failed: 0, firstError: undefined, capped: false });
  });
});

describe('bulkMessage', () => {
  test('all succeeded', () => {
    assert.equal(bulkMessage({ attempted: 5, succeeded: 5, failed: 0, capped: false }, 'Hid'), 'Hid 5 items.');
    assert.equal(bulkMessage({ attempted: 1, succeeded: 1, failed: 0, capped: false }, 'Hid'), 'Hid 1 item.');
  });

  test('partial failure names both counts', () => {
    assert.equal(
      bulkMessage({ attempted: 5, succeeded: 3, failed: 2, capped: false }, 'Dismissed'),
      'Dismissed 3 of 5 items. 2 failed.',
    );
  });

  test('a capped batch says the rest were left', () => {
    const message = bulkMessage({ attempted: BULK_MAX, succeeded: BULK_MAX, failed: 0, capped: true }, 'Hid');
    assert.match(message, /Only the first 100 were processed/);
  });
});
