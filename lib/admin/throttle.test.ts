import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FAILURES, clientIp, isThrottled, pruneBeforeIso, windowStartIso } from './throttle';

const NOW = Date.UTC(2026, 8, 18, 12, 0, 0);

describe('isThrottled', () => {
  test('the limit is 5 failures', () => {
    assert.equal(MAX_FAILURES, 5);
  });

  test('allowed below the limit', () => {
    assert.equal(isThrottled(0), false);
    assert.equal(isThrottled(4), false);
  });

  test('blocked at and above the limit', () => {
    assert.equal(isThrottled(5), true);
    assert.equal(isThrottled(8), true);
  });
});

describe('window boundaries', () => {
  test('the failure window starts 15 minutes ago', () => {
    assert.equal(windowStartIso(NOW), '2026-09-18T11:45:00.000Z');
  });

  test('old attempts are pruned after 24 hours', () => {
    assert.equal(pruneBeforeIso(NOW), '2026-09-17T12:00:00.000Z');
  });
});

describe('clientIp', () => {
  test('uses the first x-forwarded-for entry', () => {
    assert.equal(clientIp('1.2.3.4, 5.6.7.8'), '1.2.3.4');
  });

  test('trims whitespace', () => {
    assert.equal(clientIp('  9.9.9.9  '), '9.9.9.9');
  });

  test('falls back to "unknown" when absent or blank', () => {
    assert.equal(clientIp(null), 'unknown');
    assert.equal(clientIp(undefined), 'unknown');
    assert.equal(clientIp(''), 'unknown');
    assert.equal(clientIp('   '), 'unknown');
    assert.equal(clientIp(', 1.2.3.4'), 'unknown');
  });
});
