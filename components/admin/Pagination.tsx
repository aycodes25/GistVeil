import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

// Which page numbers to show: the first, the last, and a window around the current one, with
// "…" where pages are skipped. Pure and small enough to reason about: [1, '…', 4, 5, 6, '…', 20].
export function pageWindow(page: number, totalPages: number, radius = 1): (number | '…')[] {
  const shown = new Set<number>([1, totalPages, page]);
  for (let offset = 1; offset <= radius; offset++) {
    shown.add(page - offset);
    shown.add(page + offset);
  }
  const numbers = [...shown].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  numbers.forEach((n, i) => {
    if (i > 0 && n - numbers[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

const cell = 'grid h-9 min-w-9 place-items-center rounded-lg px-3 text-sm font-medium transition-colors';

// Previous / page numbers / Next as plain links, so it works without JavaScript.
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(cell, 'gap-1 text-body hover:bg-sunken')}>
          <ChevronLeft aria-hidden className="size-4" /> Previous
        </Link>
      ) : (
        <span className={cn(cell, 'gap-1 text-muted/60')}>
          <ChevronLeft aria-hidden className="size-4" /> Previous
        </span>
      )}
      {pageWindow(page, totalPages).map((entry, i) =>
        entry === '…' ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-muted">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(cell, entry === page ? 'bg-primary text-white' : 'text-body hover:bg-sunken')}
          >
            {entry}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(cell, 'gap-1 text-body hover:bg-sunken')}>
          Next <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span className={cn(cell, 'gap-1 text-muted/60')}>
          Next <ChevronRight aria-hidden className="size-4" />
        </span>
      )}
    </nav>
  );
}
