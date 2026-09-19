import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarTone, longDate, severityFor, shortRef, splitPostText, weekDelta } from './present';

describe('splitPostText', () => {
  test('the first sentence is the title, the rest is the excerpt', () => {
    assert.deepEqual(splitPostText("I'm 25 and have zero savings. Where do I even start?"), {
      title: "I'm 25 and have zero savings.",
      excerpt: 'Where do I even start?',
    });
  });

  test('a single sentence is all title', () => {
    assert.deepEqual(splitPostText('Is it normal to still think about an ex two years later?'), {
      title: 'Is it normal to still think about an ex two years later?',
      excerpt: '',
    });
  });

  test('splits on ? and ! as well', () => {
    assert.deepEqual(splitPostText('Help! I do not know what to do. Please advise.'), {
      title: 'Help!',
      excerpt: 'I do not know what to do. Please advise.',
    });
  });

  test('a line break ends the title if it comes first', () => {
    assert.deepEqual(splitPostText('My landlord is difficult\nHe keeps entering without asking. What can I do?'), {
      title: 'My landlord is difficult',
      excerpt: 'He keeps entering without asking. What can I do?',
    });
  });

  test('a full stop inside a number or abbreviation does not end the title', () => {
    assert.equal(splitPostText('I earn 3.5 million a year, e.g. from two jobs. Is it enough?').title, 'I earn 3.5 million a year, e.g. from two jobs.');
  });

  test('text with no sentence end is all title', () => {
    assert.deepEqual(splitPostText('no punctuation here at all'), { title: 'no punctuation here at all', excerpt: '' });
  });

  test('surrounding whitespace is trimmed', () => {
    assert.deepEqual(splitPostText('   Hello there.   How are you?  '), { title: 'Hello there.', excerpt: 'How are you?' });
  });

  test('empty input', () => {
    assert.deepEqual(splitPostText('   '), { title: '', excerpt: '' });
  });

  test('a very long first sentence is cut at a word boundary with an ellipsis, and nothing is lost', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const text = `${words}. And then more.`;
    const { title, excerpt } = splitPostText(text);
    assert.ok(title.endsWith('…'), 'title is marked as cut');
    assert.ok(title.length <= 111, `title length ${title.length}`);
    assert.ok(!title.slice(0, -1).endsWith(' '), 'cut on a word boundary, no trailing space');
    // title (without the ellipsis) + excerpt reproduces the original text
    assert.equal(`${title.slice(0, -1)} ${excerpt}`.replace(/\s+/g, ' '), text.replace(/\s+/g, ' '));
  });

  test('a long unbroken string is cut hard rather than never', () => {
    const { title, excerpt } = splitPostText('x'.repeat(300));
    assert.ok(title.endsWith('…'));
    assert.ok(title.length <= 111);
    assert.equal(title.slice(0, -1).length + excerpt.length, 300);
  });
});

describe('severityFor', () => {
  test('thresholds', () => {
    assert.equal(severityFor(0), 'low');
    assert.equal(severityFor(1), 'low');
    assert.equal(severityFor(2), 'medium');
    assert.equal(severityFor(3), 'high');
    assert.equal(severityFor(9), 'high');
  });
});

describe('weekDelta', () => {
  test('increase, decrease, one decimal only when needed', () => {
    assert.deepEqual(weekDelta(120, 100), { label: '+20%', direction: 'up' });
    assert.deepEqual(weekDelta(80, 100), { label: '-20%', direction: 'down' });
    assert.deepEqual(weekDelta(1142, 1000), { label: '+14.2%', direction: 'up' });
    assert.deepEqual(weekDelta(915, 1000), { label: '-8.5%', direction: 'down' });
  });

  test('unchanged', () => {
    assert.deepEqual(weekDelta(50, 50), { label: '0%', direction: 'flat' });
  });

  test('nothing the week before', () => {
    assert.deepEqual(weekDelta(5, 0), { label: 'New', direction: 'new' });
    assert.deepEqual(weekDelta(0, 0), { label: '0%', direction: 'flat' });
  });
});

describe('shortRef', () => {
  test('uppercase, first six hex characters, by type', () => {
    assert.equal(shortRef('post', '8f3a1c22-0000-4000-8000-000000000000'), 'POST-8F3A1C');
    assert.equal(shortRef('advice', 'ab12cd34-0000-4000-8000-000000000000'), 'REPLY-AB12CD');
  });
});

describe('avatarTone', () => {
  test('is stable and within range', () => {
    for (const seed of ['Anon #1247', 'Anon #893', '', 'x'.repeat(50)]) {
      const tone = avatarTone(seed);
      assert.equal(tone, avatarTone(seed));
      assert.ok(Number.isInteger(tone) && tone >= 0 && tone <= 5, `tone ${tone}`);
    }
  });

  test('different seeds spread across the palette', () => {
    const tones = new Set(Array.from({ length: 60 }, (_, i) => avatarTone(`Anon #${1000 + i * 7}`)));
    assert.ok(tones.size >= 4, `only ${tones.size} distinct tones`);
  });
});

describe('longDate', () => {
  test('month name, day and year, independent of time zone', () => {
    assert.equal(longDate(new Date(Date.UTC(2026, 8, 19, 23, 59))), 'September 19, 2026');
    assert.equal(longDate(new Date(Date.UTC(2026, 0, 5))), 'January 5, 2026');
  });
});
