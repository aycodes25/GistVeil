import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANNOUNCEMENT_MAX,
  WORD_MAX,
  escapeLike,
  isTargetType,
  isUuid,
  normalizeAnnouncement,
  parsePage,
  parseWordList,
  pickOne,
} from './validate';

describe('isUuid', () => {
  test('accepts real and seed ids, in either case', () => {
    assert.equal(isUuid('123e4567-e89b-42d3-a456-426614174000'), true);
    assert.equal(isUuid('00000000-0000-0000-0000-000000000001'), true);
    assert.equal(isUuid('123E4567-E89B-42D3-A456-426614174000'), true);
  });

  test('rejects everything else', () => {
    assert.equal(isUuid(''), false);
    assert.equal(isUuid('abc'), false);
    assert.equal(isUuid('123e4567-e89b-42d3-a456-426614174000x'), false);
    assert.equal(isUuid('x123e4567-e89b-42d3-a456-426614174000'), false);
    assert.equal(isUuid(null), false);
    assert.equal(isUuid(42), false);
    assert.equal(isUuid(undefined), false);
  });
});

describe('isTargetType', () => {
  test('only "post" and "advice"', () => {
    assert.equal(isTargetType('post'), true);
    assert.equal(isTargetType('advice'), true);
    assert.equal(isTargetType('posts'), false);
    assert.equal(isTargetType(''), false);
    assert.equal(isTargetType(undefined), false);
  });
});

describe('escapeLike', () => {
  test('escapes backslash, percent and underscore', () => {
    assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\');
  });

  test('leaves ordinary text alone', () => {
    assert.equal(escapeLike('hello world'), 'hello world');
  });
});

describe('parseWordList', () => {
  test('splits on commas and newlines, trims, lowercases and de-duplicates', () => {
    assert.deepEqual(parseWordList('Foo, bar\nBAZ ,, foo'), {
      words: ['foo', 'bar', 'baz'],
      rejected: [],
    });
  });

  test('keeps multi-word phrases intact', () => {
    assert.deepEqual(parseWordList('bad phrase'), { words: ['bad phrase'], rejected: [] });
  });

  test('accepts exactly 60 characters and rejects 61', () => {
    const ok = 'a'.repeat(WORD_MAX);
    const tooLong = 'b'.repeat(WORD_MAX + 1);
    assert.deepEqual(parseWordList(`${ok}, ${tooLong}`), { words: [ok], rejected: [tooLong] });
  });

  test('returns nothing for blank input', () => {
    assert.deepEqual(parseWordList(' , \n ,'), { words: [], rejected: [] });
  });
});

describe('normalizeAnnouncement', () => {
  test('trims', () => {
    assert.deepEqual(normalizeAnnouncement('  hello  '), { ok: true, value: 'hello' });
  });

  test('empty is allowed and means "remove the banner"', () => {
    assert.deepEqual(normalizeAnnouncement('   '), { ok: true, value: '' });
  });

  test('280 characters ok, 281 rejected', () => {
    assert.equal(normalizeAnnouncement('x'.repeat(ANNOUNCEMENT_MAX)).ok, true);
    assert.equal(normalizeAnnouncement('x'.repeat(ANNOUNCEMENT_MAX + 1)).ok, false);
  });
});

describe('parsePage', () => {
  test('defaults to 1 for anything that is not a positive integer', () => {
    for (const bad of [undefined, '', '0', '-3', 'x', '1.5', '99999999999999999999']) {
      assert.equal(parsePage(bad), 1, `input ${String(bad)}`);
    }
  });

  test('parses positive integers', () => {
    assert.equal(parsePage('3'), 3);
    assert.equal(parsePage('007'), 7);
  });
});

describe('pickOne', () => {
  test('returns the value when allowed, otherwise the fallback', () => {
    assert.equal(pickOne('b', ['a', 'b'] as const, 'a'), 'b');
    assert.equal(pickOne('bogus', ['a', 'b'] as const, 'a'), 'a');
    assert.equal(pickOne(undefined, ['a', 'b'] as const, 'a'), 'a');
  });
});
