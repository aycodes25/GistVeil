// Pure geometry helpers for the dashboard charts. No React, no DOM: everything here is
// arithmetic on numbers and strings so it can be unit-tested under plain Node.

// A "nice" axis for non-negative integer counts. The step is 1, 2 or 5 times a power of ten
// and never below 1, so small counts never get fractional ticks like 0.5 "posts".
export function niceScale(maxValue: number, targetTicks: number = 4): { max: number; ticks: number[] } {
  const raw = Number.isFinite(maxValue) && maxValue > 0 ? Math.ceil(maxValue) : 1;

  const rough = raw / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const base = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  const step = Math.max(1, base * magnitude);

  const max = Math.ceil(raw / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= max; value += step) ticks.push(value);
  return { max, ticks };
}

// Indices to label on the x axis: the last point, then every `every` points back from it.
// Anchoring on the end means the most recent day ("today") is always labelled.
export function xTickIndices(count: number, every: number): number[] {
  if (count <= 0) return [];
  const step = Math.max(1, Math.floor(every));
  const indices: number[] = [];
  for (let index = count - 1; index >= 0; index -= step) indices.unshift(index);
  return indices;
}

// "2026-09-18" -> "Sep 18". These are calendar dates, not instants, so format in UTC to
// avoid the machine's time zone shifting the day (and to keep server and client identical).
export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Which data point is closest to a pointer at `x`, given where the plot starts, how wide it
// is and how many points it holds. Clamped to a valid index.
export function nearestIndex(x: number, plotLeft: number, plotWidth: number, count: number): number {
  if (count <= 1 || plotWidth <= 0) return 0;
  const raw = Math.round(((x - plotLeft) / plotWidth) * (count - 1));
  return Math.min(count - 1, Math.max(0, raw));
}

// SVG path for a polyline, rounded to 2 decimals to keep the markup small.
export function linePath(points: { x: number; y: number }[]): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join('');
}
