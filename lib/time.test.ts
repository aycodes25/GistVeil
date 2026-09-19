import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { timeAgoLong } from './time';

const now = Date.parse('2026-09-19T12:00:00Z');
const ago = (ms: number) => new Date(now - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('timeAgoLong', () => {
  test('under a minute is "just now"', () => {
    assert.equal(timeAgoLong(ago(0), now), 'just now');
    assert.equal(timeAgoLong(ago(59_000), now), 'just now');
  });

  test('a timestamp slightly in the future (clock skew) is "just now", not negative', () => {
    assert.equal(timeAgoLong(ago(-30_000), now), 'just now');
  });

  test('minutes, singular and plural', () => {
    assert.equal(timeAgoLong(ago(MIN), now), '1 minute ago');
    assert.equal(timeAgoLong(ago(45 * MIN), now), '45 minutes ago');
  });

  test('hours, singular and plural', () => {
    assert.equal(timeAgoLong(ago(HOUR), now), '1 hour ago');
    assert.equal(timeAgoLong(ago(2 * HOUR + 30 * MIN), now), '2 hours ago');
    assert.equal(timeAgoLong(ago(23 * HOUR + 59 * MIN), now), '23 hours ago');
  });

  test('days, then months, then years', () => {
    assert.equal(timeAgoLong(ago(DAY), now), '1 day ago');
    assert.equal(timeAgoLong(ago(29 * DAY), now), '29 days ago');
    assert.equal(timeAgoLong(ago(30 * DAY), now), '1 month ago');
    assert.equal(timeAgoLong(ago(90 * DAY), now), '3 months ago');
    assert.equal(timeAgoLong(ago(400 * DAY), now), '1 year ago');
    assert.equal(timeAgoLong(ago(800 * DAY), now), '2 years ago');
  });

  test('an unreadable timestamp gives nothing rather than "NaN days ago"', () => {
    assert.equal(timeAgoLong('not a date', now), '');
  });
});
