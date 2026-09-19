// A single measure across categories: one series, so one colour for every bar and no legend.
// Categories have no natural order, so bars are sorted by value and never value-ramped. Bars are
// 20px thick (<= 24px), grow from one baseline, and have a 4px rounded data end and a square
// baseline end. The value sits at the tip of each bar, so every number is readable without hovering.

export function CategoryBars({ rows }: { rows: { label: string; count: number }[] }) {
  const highest = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ul className="viz-root flex flex-col gap-3">
      {rows.map((row) => (
        <li
          key={row.label}
          title={`${row.label}: ${row.count.toLocaleString('en-US')} ${row.count === 1 ? 'post' : 'posts'}`}
          className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm"
        >
          <span className="truncate text-[var(--viz-ink-secondary)]">{row.label}</span>
          <span className="flex items-center gap-2">
            {row.count > 0 && (
              <span
                aria-hidden="true"
                className="block h-5 rounded-r-[4px] bg-[var(--viz-series-1)] transition-[filter] hover:brightness-110"
                // Capped at 80% so the value label always fits beside the longest bar.
                style={{ width: `${(row.count / highest) * 80}%` }}
              />
            )}
            <span className="font-medium text-[var(--viz-ink)]">{row.count.toLocaleString('en-US')}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
