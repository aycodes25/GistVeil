import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  label: ReactNode;
  href: string;
  active: boolean;
}

// "sm" is the feed's filter bar (12px labels, tabs touching); "md" is the roomier admin tab strip.
const sizes = {
  sm: { track: 'gap-0', tab: 'px-4 py-2 text-xs' },
  md: { track: 'gap-1', tab: 'px-3.5 py-1.5 text-sm' },
};

// Segmented, link-based tabs: the selection lives in the URL, so it survives a reload and needs
// no client state. The active tab is a raised page-coloured pill inside a sunken track.
export function Tabs({
  items,
  label,
  size = 'md',
  className,
}: {
  items: TabItem[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn('inline-flex max-w-full items-center overflow-x-auto rounded-xl bg-sunken p-1', sizes[size].track, className)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            'rounded-lg font-medium whitespace-nowrap transition-colors',
            sizes[size].tab,
            item.active ? 'bg-page text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
