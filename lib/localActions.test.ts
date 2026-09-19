import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANGE_EVENT,
  dismissReminder,
  hasReported,
  hasVoted,
  isReminderDismissed,
  markReported,
  markVoted,
  subscribeLocalActions,
} from './localActions';

// A minimal browser: an in-memory localStorage and a window that can dispatch events.
class MemoryStorage {
  private data = new Map<string, string>();
  broken = false;
  getItem(key: string) {
    if (this.broken) throw new Error('storage blocked');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.broken) throw new Error('storage blocked');
    this.data.set(key, value);
  }
}

const g = globalThis as Record<string, unknown>;
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  g.localStorage = storage;
  g.window = new EventTarget();
});

afterEach(() => {
  delete g.localStorage;
  delete g.window;
});

describe('voted and reported ids', () => {
  test('start empty, then remember what was marked', () => {
    assert.equal(hasVoted('a1'), false);
    markVoted('a1');
    assert.equal(hasVoted('a1'), true);
    assert.equal(hasVoted('a2'), false);
  });

  test('votes and reports are kept apart', () => {
    markVoted('x');
    assert.equal(hasReported('x'), false);
    markReported('x');
    assert.equal(hasReported('x'), true);
  });

  test('ids accumulate rather than replace each other', () => {
    markVoted('a1');
    markVoted('a2');
    assert.equal(hasVoted('a1'), true);
    assert.equal(hasVoted('a2'), true);
  });

  test('corrupt stored data reads as empty instead of throwing', () => {
    storage.setItem('gistveil_voted_advice_ids', '{not json');
    assert.equal(hasVoted('a1'), false);
    markVoted('a1'); // and it recovers on the next write
    assert.equal(hasVoted('a1'), true);
  });

  test('blocked storage (private mode) neither throws nor pretends to remember', () => {
    storage.broken = true;
    assert.equal(hasVoted('a1'), false);
    assert.doesNotThrow(() => markVoted('a1'));
    assert.equal(hasVoted('a1'), false);
  });
});

describe('the reminder', () => {
  test('is showing until dismissed, and stays dismissed', () => {
    assert.equal(isReminderDismissed(), false);
    dismissReminder();
    assert.equal(isReminderDismissed(), true);
  });

  test('blocked storage: not remembered, but it does not throw', () => {
    storage.broken = true;
    assert.doesNotThrow(() => dismissReminder());
    assert.equal(isReminderDismissed(), false);
  });
});

describe('subscribeLocalActions', () => {
  test('is told about every write, and stops when unsubscribed', () => {
    let calls = 0;
    const unsubscribe = subscribeLocalActions(() => calls++);
    markVoted('a1');
    markReported('p1');
    dismissReminder();
    assert.equal(calls, 3);

    unsubscribe();
    markVoted('a2');
    assert.equal(calls, 3);
  });

  test('a write announces itself even when storage is blocked, so the UI still updates', () => {
    storage.broken = true;
    let calls = 0;
    subscribeLocalActions(() => calls++);
    markVoted('a1');
    assert.equal(calls, 1);
  });

  test('exports the event name it dispatches', () => {
    assert.equal(CHANGE_EVENT, 'gistveil:local-actions');
  });
});
