import { Clock, EyeOff, Flag, Search, TriangleAlert } from 'lucide-react';
import { Pagination } from '@/components/admin/Pagination';
import { ReportsTable, type ReportTableRow } from '@/components/admin/ReportsTable';
import { severityBadge } from '@/components/admin/severity';
import { AdminShell } from '@/components/shell/AdminShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchDashboard, fetchReportsList } from '@/lib/admin/queries';
import { PAGE_SIZE, parsePage, pickOne } from '@/lib/admin/validate';
import { categoryLabel } from '@/lib/categories';
import { shortRef } from '@/lib/present';
import { timeAgo } from '@/lib/time';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await verifyAdmin();

  const sp = await searchParams;
  const type = pickOne(first(sp.type), ['all', 'post', 'advice'] as const, 'all');
  const q = (first(sp.q) ?? '').trim().slice(0, 100);
  const page = parsePage(first(sp.page));

  const [dashboard, list] = await Promise.all([
    fetchDashboard(),
    fetchReportsList({ type: type === 'all' ? undefined : type, q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  ]);
  const { totals } = dashboard;
  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  const rows: ReportTableRow[] = list.items.map((item) => ({
    type: item.type,
    id: item.id,
    postId: item.postId,
    body: item.body,
    categoryLabel: item.category ? categoryLabel(item.category) : null,
    authorId: item.authorId,
    authorName: item.authorName,
    reportCount: item.reportCount,
    ref: shortRef(item.type, item.id),
    severity: severityBadge(item.reportCount),
    reportedAgo: timeAgo(item.latestReportAt),
  }));

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    if (type !== 'all') params.set('type', type);
    if (q) params.set('q', q);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `/admin/reports?${query}` : '/admin/reports';
  };

  const shownFrom = list.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const shownTo = (page - 1) * PAGE_SIZE + rows.length;

  return (
    <AdminShell crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Reports' }]} title="Moderation Queue">
      <div className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-8">
        <section aria-label="Totals" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Pending" value={totals.open_reports.toLocaleString('en-US')} icon={<Flag aria-hidden />} note="open reports" />
          <StatCard label="Urgent (High)" value={totals.urgent_reports.toLocaleString('en-US')} icon={<TriangleAlert aria-hidden />} note="3 or more reports" />
          <StatCard label="New reports (24h)" value={totals.new_reports_24h.toLocaleString('en-US')} icon={<Clock aria-hidden />} note="filed in the last 24 hours" />
          <StatCard label="Hidden items" value={totals.hidden_items.toLocaleString('en-US')} icon={<EyeOff aria-hidden />} note="posts and replies" />
        </section>

        <Card className="mt-8 overflow-hidden">
          <form method="get" action="/admin/reports" className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
            <div role="search" className="relative min-w-52 flex-1 sm:max-w-xs">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                maxLength={100}
                placeholder="Filter reports..."
                aria-label="Filter reports by text or author"
                className="h-10 w-full rounded-xl border border-border-strong bg-page pr-4 pl-10 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <Select name="type" defaultValue={type} aria-label="Type of item" className="w-40">
              <option value="all">All Reports</option>
              <option value="post">Posts</option>
              <option value="advice">Replies</option>
            </Select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>

          <ReportsTable key={`${type}|${q}|${page}`} rows={rows} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft px-4 py-3">
            <p className="text-sm text-muted">
              {list.total === 0
                ? 'Showing 0 reports'
                : `Showing ${shownFrom}–${shownTo} of ${list.total.toLocaleString('en-US')} reports`}
            </p>
            <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
