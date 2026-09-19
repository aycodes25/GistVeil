import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { FEED_PAGE_SIZE, SEARCH_MAX, feedHref, headline, parseCategory, parseSearch, resultsLabel, toFeedPost, toFeedPosts } from './feed';
import type { FeedRow } from './feed';

describe('parseCategory', () => {
  test('accepts the six real categories', () => {
    for (const value of ['relationship', 'money', 'family', 'work', 'mental_health', 'education']) {
      assert.equal(parseCategory(value), value);
    }
  });

  test('anything else means "all"', () => {
    assert.equal(parseCategory(undefined), undefined);
    assert.equal(parseCategory(''), undefined);
    assert.equal(parseCategory('technology'), undefined);
    assert.equal(parseCategory("work'; drop table posts;--"), undefined);
  });

  test('takes the first of a repeated parameter', () => {
    assert.equal(parseCategory(['money', 'work']), 'money');
  });
});

describe('parseSearch', () => {
  test('trims and collapses whitespace', () => {
    assert.equal(parseSearch('  quiet   \n  village  '), 'quiet village');
  });

  test('missing or blank is empty', () => {
    assert.equal(parseSearch(undefined), '');
    assert.equal(parseSearch('   '), '');
  });

  test('is capped', () => {
    assert.equal(parseSearch('a'.repeat(SEARCH_MAX + 50)).length, SEARCH_MAX);
  });

  test('takes the first of a repeated parameter', () => {
    assert.equal(parseSearch(['first', 'second']), 'first');
  });
});

describe('feedHref', () => {
  test('is the bare home page with no filter', () => {
    assert.equal(feedHref({}), '/');
  });

  test('keeps only what is set, and encodes it', () => {
    assert.equal(feedHref({ category: 'money' }), '/?category=money');
    assert.equal(feedHref({ q: 'a b&c' }), '/?q=a+b%26c');
    assert.equal(feedHref({ category: 'work', q: 'boss' }), '/?category=work&q=boss');
  });
});

describe('headline', () => {
  test('drops a lone closing full stop', () => {
    assert.equal(headline('Dealing with a friendship that feels one-sided.'), 'Dealing with a friendship that feels one-sided');
    assert.equal(headline("I'm 25 and have zero savings."), "I'm 25 and have zero savings");
  });

  test('keeps ? ! and ellipses', () => {
    assert.equal(headline('Is it normal to still think about an ex?'), 'Is it normal to still think about an ex?');
    assert.equal(headline('Help!'), 'Help!');
    assert.equal(headline('Well...'), 'Well...');
    assert.equal(headline('A very long first sentence that was cut…'), 'A very long first sentence that was cut…');
  });

  test('leaves a title with no closing stop alone', () => {
    assert.equal(headline('No punctuation here'), 'No punctuation here');
    assert.equal(headline(''), '');
  });
});

describe('toFeedPost', () => {
  const now = Date.parse('2026-09-19T12:00:00Z');
  const row: FeedRow = {
    id: 'p1',
    anon_user_id: 'u1',
    category: 'work',
    body: 'I feel overwhelmed at my new job. How do I ask for help?',
    report_count: 0,
    created_at: '2026-09-19T10:00:00Z',
    pinned_at: null,
    anon_users: { anon_name: 'Anon #4821' },
    advices: [{ count: 3 }],
  };

  test('formats everything a card shows', () => {
    assert.deepEqual(toFeedPost(row, now), {
      id: 'p1',
      category: 'work',
      categoryLabel: 'Work/Career',
      title: 'I feel overwhelmed at my new job',
      excerpt: 'How do I ask for help?',
      authorName: 'Anon #4821',
      timeLabel: '2 hours ago',
      pinned: false,
      replies: 3,
    });
  });

  test('a pinned post says so', () => {
    assert.equal(toFeedPost({ ...row, pinned_at: '2026-09-18T00:00:00Z' }, now).pinned, true);
  });

  test('a database without pins (no pinned_at column) is simply not pinned', () => {
    const { pinned_at: _unused, ...withoutPins } = row;
    void _unused;
    assert.equal(toFeedPost(withoutPins, now).pinned, false);
  });

  test('a missing author or reply count falls back', () => {
    const bare = toFeedPost({ ...row, anon_users: undefined, advices: undefined }, now);
    assert.equal(bare.authorName, 'Anon');
    assert.equal(bare.replies, 0);
  });
});

describe('toFeedPosts', () => {
  const at = (created_at: string, id: string): FeedRow => ({
    id,
    anon_user_id: 'u1',
    category: 'money',
    body: 'Body.',
    report_count: 0,
    created_at,
  });

  test('labels every post against the same moment', () => {
    const now = Date.parse('2026-09-19T12:00:00Z');
    const posts = toFeedPosts([at('2026-09-19T11:00:00Z', 'a'), at('2026-09-17T12:00:00Z', 'b')], now);
    assert.deepEqual(posts.map((p) => [p.id, p.timeLabel]), [['a', '1 hour ago'], ['b', '2 days ago']]);
  });

  test('an empty page is an empty list', () => {
    assert.deepEqual(toFeedPosts([]), []);
  });
});

describe('resultsLabel', () => {
  test('says how many are shown of the total while more remain', () => {
    assert.equal(resultsLabel(FEED_PAGE_SIZE, 128), 'Showing 30 of 128 results');
  });

  test('just the total once everything is shown', () => {
    assert.equal(resultsLabel(4, 4), 'Showing 4 results');
    assert.equal(resultsLabel(1, 1), 'Showing 1 result');
  });
});
