import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  label: ReactNode;
  href: string;
  active: boolean;
}

// Segmented, link-based tabs: the selection lives in the URL, so it survives a reload and needs
// no client state. The active tab is a raised page-coloured pill inside a sunken track.
export function Tabs({
  items,
  label,
  className,
}: {
  items: TabItem[];
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn('inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-sunken p-1', className)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
            item.active ? 'bg-page text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
