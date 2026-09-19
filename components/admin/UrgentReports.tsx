import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { ReportRow } from '@/lib/admin/types';
import { shortRef } from '@/lib/present';
import { timeAgo } from '@/lib/time';
import { severityBadge } from './severity';

// The most-reported open items, for the dashboard. Severity is derived from how many people reported
// the item (reports carry no reason or severity of their own).
export function UrgentReports({ items, total }: { items: ReportRow[]; total: number }) {
  return (
    <Card className="flex max-h-[479px] flex-col p-6">
      <h2 className="font-heading text-lg leading-7 font-semibold text-ink">Urgent Reports</h2>
      <p className="mt-1 text-sm text-muted">
        Queue density: {total.toLocaleString('en-US')} {total === 1 ? 'item' : 'items'} pending
      </p>

      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border-soft px-4 py-8 text-center text-sm text-muted">
          No open reports. Nothing needs review.
        </p>
      ) : (
        <ul className="mt-5 flex min-h-0 flex-col gap-4 overflow-y-auto pr-1" tabIndex={0} aria-label="Most-reported items">
          {items.map((item) => {
            const severity = severityBadge(item.reportCount);
            return (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href="/admin/reports"
                  className="block rounded-xl border border-border-soft bg-sunken/60 p-4 transition-colors hover:border-divider hover:bg-sunken"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted">{shortRef(item.type, item.id)}</span>
                    <Badge tone={severity.tone} size="xs">
                      {severity.label}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-[23px] text-ink [overflow-wrap:anywhere]">{item.body}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                    <span className="font-semibold tracking-wide uppercase">
                      Pending · {item.reportCount} {item.reportCount === 1 ? 'report' : 'reports'}
                    </span>
                    <span>{timeAgo(item.latestReportAt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
