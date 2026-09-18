import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createWordsLoader } from './blockedWordsCache';

const TTL = 5 * 60 * 1000;

function fixture(script: Array<string[] | Error>) {
  let calls = 0;
  let now = 1_000_000;
  const load = async () => {
    const next = script[Math.min(calls, script.length - 1)];
    calls++;
    if (next instanceof Error) throw next;
    return next;
  };
  return {
    loader: createWordsLoader({ load, ttlMs: TTL, now: () => now }),
    calls: () => calls,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('createWordsLoader', () => {
  test('loads once and serves the cache within the TTL', async () => {
    const f = fixture([['a', 'b']]);
    assert.deepEqual(await f.loader(), ['a', 'b']);
    f.advance(TTL - 1);
    assert.deepEqual(await f.loader(), ['a', 'b']);
    assert.equal(f.calls(), 1);
  });

  test('reloads after the TTL expires', async () => {
    const f = fixture([['a'], ['a', 'b']]);
    assert.deepEqual(await f.loader(), ['a']);
    f.advance(TTL);
    assert.deepEqual(await f.loader(), ['a', 'b']);
    assert.equal(f.calls(), 2);
  });

  test('a failed first load returns [] (posting must never be blocked by this) and is not cached', async () => {
    const f = fixture([new Error('network down'), ['x']]);
    assert.deepEqual(await f.loader(), []);
    assert.deepEqual(await f.loader(), ['x']); // retried immediately, not stuck on the failure
    assert.equal(f.calls(), 2);
  });

  test('a failed refresh falls back to the last good list', async () => {
    const f = fixture([['keep'], new Error('boom')]);
    assert.deepEqual(await f.loader(), ['keep']);
    f.advance(TTL);
    assert.deepEqual(await f.loader(), ['keep']);
  });

  test('the fallback list is retried on the next call, not cached as fresh', async () => {
    const f = fixture([['keep'], new Error('boom'), ['fresh']]);
    await f.loader();
    f.advance(TTL);
    assert.deepEqual(await f.loader(), ['keep']); // failed refresh
    assert.deepEqual(await f.loader(), ['fresh']); // retried straight away
    assert.equal(f.calls(), 3);
  });
});
