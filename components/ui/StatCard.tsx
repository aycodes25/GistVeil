import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from '@/lib/cn';
import type { WeekDelta } from '@/lib/present';

// A headline number. `delta` is the real week-on-week change (see weekDelta); `note` is any other
// small line under the number, such as "in the last 24 hours".
export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaCaption = 'vs last week',
  note,
  className,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  delta?: WeekDelta;
  deltaCaption?: string;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('flex items-start justify-between gap-3 p-5', className)}>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 font-heading text-3xl leading-tight font-semibold text-ink">{value}</p>
        {delta && (
          <p className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-semibold',
                delta.direction === 'up' && 'text-emerald-600',
                delta.direction === 'down' && 'text-red-500',
                (delta.direction === 'flat' || delta.direction === 'new') && 'text-muted',
              )}
            >
              {delta.direction === 'up' && <ArrowUpRight aria-hidden className="size-3.5" />}
              {delta.direction === 'down' && <ArrowDownRight aria-hidden className="size-3.5" />}
              {delta.label}
            </span>
            <span className="text-muted">{deltaCaption}</span>
          </p>
        )}
        {note && <p className="mt-2 text-xs text-muted">{note}</p>}
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-chip text-primary [&>svg]:size-5">
        {icon}
      </span>
    </Card>
  );
}
