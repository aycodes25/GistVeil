'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { bandCentre, bandIndex, formatDay, niceScale, smoothPath, weekdayShort } from '@/lib/admin/chartMath';

export interface GrowthPoint {
  /** Calendar day, "YYYY-MM-DD" (UTC). */
  day: string;
  content: number;
  users: number;
  reports: number;
}

// Three series, all counts per day, on ONE shared axis (so no dual axis): new content as an area with
// its line, new anonymous users as bars, reports as a line. Colours are the validated --viz-series-*
// tokens in a fixed order. Identity is carried by the legend, the tooltip and the table view, not by
// colour alone. Days are equal bands, with the bars and points centred in them.
const SERIES = [
  { key: 'content', label: 'New content', hint: 'posts and advice', color: 'var(--viz-series-1)' },
  { key: 'users', label: 'New users', hint: 'anonymous', color: 'var(--viz-series-2)' },
  { key: 'reports', label: 'Reports', hint: 'filed', color: 'var(--viz-series-3)' },
] as const;

const HEIGHT = 330;
const MARGIN = { top: 14, right: 12, bottom: 30, left: 42 };
const BAR_MAX = 20;

// A bar that grows from the baseline with a 4px rounded top and a square bottom.
function barPath(x: number, width: number, top: number, bottom: number): string {
  const r = Math.min(4, width / 2, Math.max(0, bottom - top));
  const left = x - width / 2;
  const right = x + width / 2;
  return `M${left} ${bottom}V${top + r}Q${left} ${top} ${left + r} ${top}H${right - r}Q${right} ${top} ${right} ${top + r}V${bottom}Z`;
}

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId();
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setWidth(Math.max(240, Math.floor(element.getBoundingClientRect().width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const count = data.length;
  if (count === 0) return <p className="text-sm text-muted">No activity yet.</p>;

  const plotLeft = MARGIN.left;
  const plotRight = width - MARGIN.right;
  const plotWidth = plotRight - plotLeft;
  const plotTop = MARGIN.top;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const plotHeight = plotBottom - plotTop;

  const highest = Math.max(0, ...data.flatMap((d) => [d.content, d.users, d.reports]));
  const { max, ticks } = niceScale(highest);

  const xAt = (i: number) => bandCentre(i, count, plotLeft, plotWidth);
  const yAt = (value: number) => plotTop + plotHeight * (1 - value / max);
  const last = count - 1;
  const totals = SERIES.map((s) => data.reduce((sum, d) => sum + d[s.key], 0));
  const barWidth = Math.min(BAR_MAX, (plotWidth / count) * 0.45);

  const contentPoints = data.map((d, i) => ({ x: xAt(i), y: yAt(d.content) }));
  const reportPoints = data.map((d, i) => ({ x: xAt(i), y: yAt(d.reports) }));
  const contentLine = smoothPath(contentPoints);
  const contentArea = `${contentLine}L${xAt(last)} ${plotBottom}L${xAt(0)} ${plotBottom}Z`;

  function handlePointer(event: React.PointerEvent<SVGRectElement>) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    setActive(bandIndex(event.clientX - box.left, plotLeft, plotWidth, count));
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

  const point = active === null ? null : data[active];
  const flip = active !== null && xAt(active) > width / 2;

  return (
    <div className="viz-root">
      <ul aria-label="Legend" className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[var(--viz-ink-secondary)]">
        {SERIES.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            {s.key === 'reports' ? (
              <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            ) : (
              <span aria-hidden className="inline-block size-2.5 rounded-[3px]" style={{ background: s.color }} />
            )}
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
        <svg
          ref={svgRef}
          width={width}
          height={HEIGHT}
          className="block select-none"
          role="img"
          aria-label={`Chart of new content, new users and reports per day over the last ${count} days. The table below lists every value.`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-series-1)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--viz-series-1)" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={plotLeft}
                x2={plotRight}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke={tick === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'}
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : '4 4'}
              />
              <text x={plotLeft - 10} y={yAt(tick)} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--viz-ink-muted)">
                {tick.toLocaleString('en-US')}
              </text>
            </g>
          ))}

          {data.map((d, i) => (
            <text key={d.day} x={xAt(i)} y={plotBottom + 19} textAnchor="middle" fontSize={12} fill="var(--viz-ink-muted)">
              {weekdayShort(d.day)}
            </text>
          ))}

          <path d={contentArea} fill={`url(#${gradientId})`} />
          <path d={contentLine} fill="none" stroke="var(--viz-series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {data.map((d, i) =>
            d.users > 0 ? (
              <path
                key={d.day}
                d={barPath(xAt(i), barWidth, yAt(d.users), plotBottom)}
                fill="var(--viz-series-2)"
                opacity={active === null || active === i ? 1 : 0.55}
              />
            ) : null,
          )}

          <path d={smoothPath(reportPoints)} fill="none" stroke="var(--viz-series-3)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* End dots: r=4 (8px) with a 2px ring in the surface colour so overlaps stay legible. */}
          {([contentPoints, reportPoints] as const).map((points, k) => (
            <circle
              key={k}
              cx={points[last].x}
              cy={points[last].y}
              r={4}
              fill={k === 0 ? 'var(--viz-series-1)' : 'var(--viz-series-3)'}
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
          ))}

          {active !== null && point && (
            <g pointerEvents="none">
              <line x1={xAt(active)} x2={xAt(active)} y1={plotTop} y2={plotBottom} stroke="var(--viz-ink-muted)" strokeWidth={1} />
              {[
                { y: yAt(point.content), color: 'var(--viz-series-1)' },
                { y: yAt(point.reports), color: 'var(--viz-series-3)' },
              ].map((dot, k) => (
                <circle key={k} cx={xAt(active)} cy={dot.y} r={4} fill={dot.color} stroke="var(--viz-surface)" strokeWidth={2} />
              ))}
            </g>
          )}

          {/* The whole plot band is the hit target: readers aim at a day, not at a 2px line. */}
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            style={{ touchAction: 'pan-y' }}
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {active !== null && point && (
          <div
            className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-lg"
            style={{
              top: plotTop,
              left: flip ? xAt(active) - 14 : xAt(active) + 14,
              transform: flip ? 'translateX(-100%)' : undefined,
            }}
          >
            <div className="mb-1 text-[var(--viz-ink-secondary)]">{formatDay(point.day)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-2 py-0.5">
                <span aria-hidden className="inline-block h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                <span className="font-semibold text-[var(--viz-ink)]">{point[s.key].toLocaleString('en-US')}</span>
                <span className="text-[var(--viz-ink-secondary)]">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-muted hover:text-ink">View as table</summary>
        <div className="mt-2 overflow-auto rounded-lg border border-border-soft">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">New content, new users and reports per day, newest first</caption>
            <thead className="bg-sunken text-xs text-muted">
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
                <tr key={d.day} className="border-t border-border-soft text-ink">
                  <th scope="row" className="px-3 py-1.5 font-normal text-body">
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
