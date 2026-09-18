import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSafety } from './safetyFilter';

describe('checkSafety (existing behaviour is unchanged)', () => {
  test('clean text passes', () => {
    assert.deepEqual(checkSafety('I need advice about my job'), { ok: true });
  });

  test('blocks phone numbers with a specific reason', () => {
    const result = checkSafety('call me on 0801 234 5678');
    assert.equal(result.ok, false);
    assert.match(result.reason ?? '', /phone/i);
  });

  test('blocks the built-in words, case-insensitively, with a specific reason', () => {
    const result = checkSafety('you are an IDIOT');
    assert.equal(result.ok, false);
    assert.match(result.reason ?? '', /offensive/i);
  });
});

describe('checkSafety with extra (database) words', () => {
  test('blocks an extra word that the built-in list does not have', () => {
    assert.equal(checkSafety('this is a scamword post').ok, true);
    const result = checkSafety('this is a scamword post', ['scamword']);
    assert.equal(result.ok, false);
    assert.match(result.reason ?? '', /offensive/i);
  });

  test('matching is case-insensitive on both sides', () => {
    assert.equal(checkSafety('SCAMWORD', ['scamword']).ok, false);
    assert.equal(checkSafety('scamword', ['ScamWord']).ok, false);
  });

  test('multi-word phrases match as a substring', () => {
    assert.equal(checkSafety('buy followers now', ['buy followers']).ok, false);
  });

  test('empty or whitespace-only entries never block everything', () => {
    assert.equal(checkSafety('a perfectly fine post', ['', '   ']).ok, true);
  });

  test('the phone rule still applies when extra words are given', () => {
    assert.equal(checkSafety('call 08012345678', ['unrelated']).ok, false);
  });

  test('extra words default to none', () => {
    assert.equal(checkSafety('hello', undefined).ok, true);
    assert.equal(checkSafety('hello', []).ok, true);
  });
});
