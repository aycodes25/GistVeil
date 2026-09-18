'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDay, linePath, nearestIndex, niceScale, xTickIndices } from '@/lib/admin/chartMath';
import type { DailyPoint } from '@/lib/admin/types';

// Three series on ONE shared axis (all are counts per day), so there is no dual-axis chart.
// Colours come from the --viz-series-* tokens in globals.css, assigned in a fixed order.
// Identity is carried by the legend, the tooltip and the table view rather than by end
// labels: on a small site the three lines converge near zero and end labels would collide.
const SERIES = [
  { key: 'posts', label: 'New posts', color: 'var(--viz-series-1)' },
  { key: 'advices', label: 'New advice', color: 'var(--viz-series-2)' },
  { key: 'new_users', label: 'New users', color: 'var(--viz-series-3)' },
] as const;

const HEIGHT = 240; // includes the x-axis band, so the card never gets a nested scrollbar
const MARGIN = { top: 12, right: 16, bottom: 28, left: 40 };
const X_LABEL_EVERY = 7;

export function ActivityChart({ data }: { data: DailyPoint[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  // The observer reports the initial size as soon as it starts observing, and again on resize.
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setWidth(Math.max(280, Math.floor(element.getBoundingClientRect().width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const count = data.length;
  if (count === 0) {
    return <p className="text-sm text-neutral-400">No activity yet.</p>;
  }

  const plotLeft = MARGIN.left;
  const plotRight = width - MARGIN.right;
  const plotWidth = plotRight - plotLeft;
  const plotTop = MARGIN.top;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const plotHeight = plotBottom - plotTop;

  const highest = Math.max(0, ...data.flatMap((d) => [d.posts, d.advices, d.new_users]));
  const { max, ticks } = niceScale(highest);

  const xAt = (index: number) =>
    count === 1 ? plotLeft + plotWidth / 2 : plotLeft + (index / (count - 1)) * plotWidth;
  const yAt = (value: number) => plotTop + plotHeight * (1 - value / max);

  const totals = SERIES.map((s) => data.reduce((sum, d) => sum + d[s.key], 0));
  const last = count - 1;

  function handlePointer(event: React.PointerEvent<SVGRectElement>) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    setActive(nearestIndex(event.clientX - box.left, plotLeft, plotWidth, count));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') return setActive(null);
    if (event.key === 'Home') return setActive(0);
    if (event.key === 'End') return setActive(last);
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    setActive((current) => Math.min(last, Math.max(0, (current ?? last) + (current === null ? 0 : step))));
  }

  const activePoint = active === null ? null : data[active];
  const flipTooltip = active !== null && xAt(active) > width / 2;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Legend">
        {SERIES.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 text-[var(--viz-ink-secondary)]">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
            <span className="text-[var(--viz-ink-muted)]">· {totals[i].toLocaleString('en-US')}</span>
          </li>
        ))}
      </ul>

      <div
        ref={wrapperRef}
        className="relative outline-offset-4"
        style={{ height: HEIGHT }}
        tabIndex={0}
        role="group"
        aria-label="Daily activity. Use the left and right arrow keys to move between days."
        onKeyDown={handleKeyDown}
        onFocus={(event) => {
          // Show the latest day on keyboard focus only; a mouse click shouldn't pop a tooltip.
          if (event.currentTarget.matches(':focus-visible')) setActive((c) => c ?? last);
        }}
        onBlur={() => setActive(null)}
      >
        <svg ref={svgRef} width={width} height={HEIGHT} className="block select-none" role="img"
          aria-label={`Line chart of daily new posts, advice and users over the last ${count} days. The table below lists every value.`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={plotLeft}
                x2={plotRight}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke={tick === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'}
                strokeWidth={1}
              />
              <text
                x={plotLeft - 8}
                y={yAt(tick)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill="var(--viz-ink-muted)"
              >
                {tick.toLocaleString('en-US')}
              </text>
            </g>
          ))}

          {xTickIndices(count, X_LABEL_EVERY).map((index) => (
            <text
              key={index}
              x={xAt(index)}
              y={plotBottom + 18}
              textAnchor={index === last ? 'end' : 'middle'}
              fontSize={11}
              fill="var(--viz-ink-muted)"
            >
              {formatDay(data[index].day)}
            </text>
          ))}

          {SERIES.map((s) => (
            <path
              key={s.key}
              d={linePath(data.map((d, i) => ({ x: xAt(i), y: yAt(d[s.key]) })))}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* End dots: r=4 (8px) with a 2px ring in the surface colour so overlaps stay legible. */}
          {SERIES.map((s) => (
            <circle
              key={s.key}
              cx={xAt(last)}
              cy={yAt(data[last][s.key])}
              r={4}
              fill={s.color}
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
          ))}

          {active !== null && activePoint && (
            <g pointerEvents="none">
              <line
                x1={xAt(active)}
                x2={xAt(active)}
                y1={plotTop}
                y2={plotBottom}
                stroke="var(--viz-ink-muted)"
                strokeWidth={1}
              />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={xAt(active)}
                  cy={yAt(activePoint[s.key])}
                  r={4}
                  fill={s.color}
                  stroke="var(--viz-surface)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          {/* The whole plot band is the hit target: readers aim at a day, not at a 2px line. */}
          <rect
            x={plotLeft - 8}
            y={plotTop}
            width={plotWidth + 16}
            height={plotHeight}
            fill="transparent"
            style={{ touchAction: 'pan-y' }}
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {active !== null && activePoint && (
          <div
            className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs shadow-lg"
            style={{
              top: plotTop,
              left: flipTooltip ? xAt(active) - 12 : xAt(active) + 12,
              transform: flipTooltip ? 'translateX(-100%)' : undefined,
            }}
          >
            <div className="mb-1 text-[var(--viz-ink-secondary)]">{formatDay(activePoint.day)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-2 py-0.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-3 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="font-semibold text-[var(--viz-ink)]">
                  {activePoint[s.key].toLocaleString('en-US')}
                </span>
                <span className="text-[var(--viz-ink-secondary)]">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-neutral-400 hover:text-white">
          View as table
        </summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">Daily new posts, advice and users, newest first</caption>
            <thead className="sticky top-0 bg-neutral-950 text-xs text-neutral-400">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Day</th>
                {SERIES.map((s) => (
                  <th key={s.key} scope="col" className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-t border-neutral-800 text-neutral-200">
                  <th scope="row" className="px-3 py-1.5 font-normal text-neutral-300">
                    {formatDay(d.day)}
                  </th>
                  {SERIES.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right">
                      {d[s.key].toLocaleString('en-US')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
