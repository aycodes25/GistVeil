import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBans } from './bans';
import type { BanRow } from './types';

const now = Date.parse('2026-09-19T12:00:00Z');
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();
const ban = (overrides: Partial<BanRow>): BanRow => ({
  deviceToken: 't',
  reason: null,
  bannedAt: daysAgo(1),
  authorId: 'a',
  authorName: 'Anon #1',
  postCount: 0,
  adviceCount: 0,
  ...overrides,
});

describe('summarizeBans', () => {
  test('no bans gives zeros', () => {
    assert.deepEqual(summarizeBans([], now), { total: 0, last30Days: 0, contentFromBanned: 0, withReason: 0 });
  });

  test('counts every figure from the rows', () => {
    const summary = summarizeBans(
      [
        ban({ bannedAt: daysAgo(2), reason: 'Spam', postCount: 3, adviceCount: 1 }),
        ban({ bannedAt: daysAgo(29), reason: '   ', postCount: 0, adviceCount: 2 }),
        ban({ bannedAt: daysAgo(90), reason: 'Harassment', postCount: 5, adviceCount: 0 }),
      ],
      now,
    );
    assert.deepEqual(summary, { total: 3, last30Days: 2, contentFromBanned: 11, withReason: 2 });
  });

  test('a blank reason does not count as having one', () => {
    assert.equal(summarizeBans([ban({ reason: '' }), ban({ reason: '  ' }), ban({ reason: null })], now).withReason, 0);
  });

  test('a ban exactly 30 days old is still inside the window; 31 days is not', () => {
    assert.equal(summarizeBans([ban({ bannedAt: daysAgo(30) })], now).last30Days, 1);
    assert.equal(summarizeBans([ban({ bannedAt: daysAgo(31) })], now).last30Days, 0);
  });
});
