import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDay, linePath, nearestIndex, niceScale, xTickIndices } from './chartMath';

describe('niceScale', () => {
  test('all-zero data still gets a usable 0..1 axis', () => {
    assert.deepEqual(niceScale(0), { max: 1, ticks: [0, 1] });
  });

  test('small counts use a unit step so every tick is a whole number', () => {
    assert.deepEqual(niceScale(3), { max: 3, ticks: [0, 1, 2, 3] });
    assert.deepEqual(niceScale(4), { max: 4, ticks: [0, 1, 2, 3, 4] });
  });

  test('rounds the maximum up to a clean multiple of the step', () => {
    assert.deepEqual(niceScale(7), { max: 8, ticks: [0, 2, 4, 6, 8] });
    assert.deepEqual(niceScale(23), { max: 30, ticks: [0, 10, 20, 30] });
    assert.deepEqual(niceScale(100), { max: 100, ticks: [0, 50, 100] });
    assert.deepEqual(niceScale(1200), { max: 1500, ticks: [0, 500, 1000, 1500] });
  });

  test('the axis maximum always covers the data', () => {
    for (const value of [1, 2, 5, 9, 11, 26, 49, 99, 101, 999, 12345]) {
      assert.ok(niceScale(value).max >= value, `max covers ${value}`);
    }
  });

  test('bad input (negative, NaN, fractional) is handled', () => {
    assert.deepEqual(niceScale(-5), { max: 1, ticks: [0, 1] });
    assert.deepEqual(niceScale(Number.NaN), { max: 1, ticks: [0, 1] });
    assert.ok(niceScale(2.5).max >= 3);
  });
});

describe('xTickIndices', () => {
  test('anchors on the last point and steps back, so "today" is always labelled', () => {
    assert.deepEqual(xTickIndices(30, 7), [1, 8, 15, 22, 29]);
  });

  test('short and empty series', () => {
    assert.deepEqual(xTickIndices(1, 7), [0]);
    assert.deepEqual(xTickIndices(5, 7), [4]);
    assert.deepEqual(xTickIndices(0, 7), []);
  });

  test('a step below 1 is treated as 1', () => {
    assert.deepEqual(xTickIndices(3, 0), [0, 1, 2]);
  });
});

describe('formatDay', () => {
  test('short month and day, without a leading zero', () => {
    assert.equal(formatDay('2026-09-18'), 'Sep 18');
    assert.equal(formatDay('2026-01-05'), 'Jan 5');
  });

  test('is independent of the machine time zone (calendar dates, not instants)', () => {
    assert.equal(formatDay('2026-12-31'), 'Dec 31');
    assert.equal(formatDay('2026-03-01'), 'Mar 1');
  });
});

describe('nearestIndex', () => {
  // plot starts at x=40, is 100px wide, holds 11 points => 10px per step
  const at = (x: number) => nearestIndex(x, 40, 100, 11);

  test('snaps to the closest day', () => {
    assert.equal(at(40), 0);
    assert.equal(at(44), 0);
    assert.equal(at(46), 1);
    assert.equal(at(140), 10);
  });

  test('clamps outside the plot', () => {
    assert.equal(at(0), 0);
    assert.equal(at(999), 10);
  });

  test('degenerate series', () => {
    assert.equal(nearestIndex(50, 40, 100, 1), 0);
    assert.equal(nearestIndex(50, 40, 100, 0), 0);
  });
});

describe('linePath', () => {
  test('joins points with M/L and rounds to 2 decimals', () => {
    assert.equal(
      linePath([
        { x: 0, y: 10 },
        { x: 5.123, y: 20.456 },
      ]),
      'M0 10L5.12 20.46',
    );
  });

  test('empty input gives an empty path', () => {
    assert.equal(linePath([]), '');
  });
});
