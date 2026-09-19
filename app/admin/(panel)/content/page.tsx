import { Activity, FileText, Flag, MessageSquare, SlidersHorizontal, Download, Search } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ContentTable, type ContentTableRow } from '@/components/admin/ContentTable';
import { Pagination } from '@/components/admin/Pagination';
import { AdminShell } from '@/components/shell/AdminShell';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchContentList, fetchDashboard } from '@/lib/admin/queries';
import type { ContentFilters } from '@/lib/admin/types';
import { PAGE_SIZE, parsePage, pickOne } from '@/lib/admin/validate';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { shortRef } from '@/lib/present';
import { timeAgo } from '@/lib/time';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// A link that keeps the current filters and overrides some of them.
function hrefFor(filters: ContentFilters, overrides: Partial<ContentFilters>): string {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (f.kind !== 'all') params.set('kind', f.kind);
  if (f.q) params.set('q', f.q);
  if (f.category !== 'all') params.set('category', f.category);
  if (f.status !== 'all') params.set('status', f.status);
  if (f.reportedOnly) params.set('reported', '1');
  if (f.page > 1) params.set('page', String(f.page));
  const query = params.toString();
  return query ? `/admin/content?${query}` : '/admin/content';
}

export default async function ContentPage({ searchParams }: { searchParams: SearchParams }) {
  await verifyAdmin();

  const sp = await searchParams;
  const filters: ContentFilters = {
    kind: pickOne(first(sp.kind), ['all', 'posts', 'advices'] as const, 'all'),
    q: (first(sp.q) ?? '').trim().slice(0, 100),
    category: pickOne(first(sp.category), ['all', ...CATEGORIES.map((c) => c.value)] as const, 'all'),
    status: pickOne(first(sp.status), ['all', 'visible', 'hidden', 'flagged'] as const, 'all'),
    reportedOnly: first(sp.reported) === '1',
    page: parsePage(first(sp.page)),
  };

  const [dashboard, list] = await Promise.all([fetchDashboard(), fetchContentList(filters)]);
  const { totals } = dashboard;

  // The requested page is past the end (a stale link, or the last item on the last page was just
  // deleted): send the viewer to the last page that exists.
  if (list.rows.length === 0 && filters.page > 1) {
    const firstPage = await fetchContentList({ ...filters, page: 1 });
    const lastPage = Math.max(1, Math.ceil(firstPage.total / PAGE_SIZE));
    redirect(hrefFor(filters, { page: Math.min(filters.page - 1, lastPage) }));
  }

  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const rows: ContentTableRow[] = list.rows.map((row) => ({
    type: row.type,
    id: row.id,
    postId: row.postId,
    body: row.body,
    categoryLabel: row.category ? categoryLabel(row.category) : null,
    authorId: row.authorId,
    authorName: row.authorName,
    hidden: row.hidden,
    pinned: Boolean(row.pinnedAt),
    reportCount: row.reportCount,
    ref: shortRef(row.type, row.id),
    status: row.hidden
      ? { label: 'Hidden', tone: 'neutral' }
      : row.reportCount > 0
        ? { label: 'Flagged', tone: 'warning' }
        : { label: 'Active', tone: 'success' },
    when: timeAgo(row.createdAt),
  }));

  const shownFrom = list.total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const shownTo = (filters.page - 1) * PAGE_SIZE + rows.length;

  const tabs = [
    { label: 'All Content', kind: 'all' as const },
    { label: 'Posts Only', kind: 'posts' as const },
    { label: 'Replies Only', kind: 'advices' as const },
  ].map((tab) => ({
    label: tab.label,
    href: hrefFor(filters, { kind: tab.kind, page: 1 }),
    active: filters.kind === tab.kind,
  }));

  const filtersActive = filters.category !== 'all' || filters.status !== 'all' || filters.reportedOnly;

  return (
    <AdminShell crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Content' }]} title="Content Management">
      <div className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-8">
        <section aria-label="Totals" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Posts" value={totals.posts.toLocaleString('en-US')} icon={<FileText aria-hidden />} />
          <StatCard label="Total Replies" value={totals.advices.toLocaleString('en-US')} icon={<MessageSquare aria-hidden />} />
          <StatCard label="Flagged Content" value={totals.open_reports.toLocaleString('en-US')} icon={<Flag aria-hidden />} note="open reports" />
          <StatCard label="Recent Activity" value={totals.new_content_24h.toLocaleString('en-US')} icon={<Activity aria-hidden />} note="new in the last 24 hours" />
        </section>

        <Card className="mt-8">
          <div className="border-b border-border-soft p-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-ink">Content Library</h2>
              <Tabs items={tabs} label="Kind of content" size="md" />
            </div>

            <form method="get" action="/admin/content" className="mt-4 flex flex-wrap items-center gap-3">
              {filters.kind !== 'all' && <input type="hidden" name="kind" value={filters.kind} />}
              <div role="search" className="relative min-w-52 flex-1 sm:max-w-xs">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  name="q"
                  defaultValue={filters.q}
                  maxLength={100}
                  placeholder="Search content or author..."
                  aria-label="Search content or author"
                  className="h-10 w-full rounded-xl border border-border-strong bg-page pr-4 pl-10 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <details className="group relative">
                <summary
                  className={`${buttonClasses({ variant: 'secondary' })} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
                >
                  <SlidersHorizontal aria-hidden className="size-4" />
                  Filters{filtersActive ? ' (on)' : ''}
                </summary>
                <div className="absolute left-0 z-20 mt-2 w-72 rounded-xl border border-border bg-page p-4 shadow-lg">
                  <label className="block text-xs font-medium text-muted">
                    Category
                    <Select name="category" defaultValue={filters.category} className="mt-1 w-full" disabled={filters.kind === 'advices'}>
                      <option value="all">All categories</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="mt-3 block text-xs font-medium text-muted">
                    Status
                    <Select name="status" defaultValue={filters.status} className="mt-1 w-full">
                      <option value="all">All</option>
                      <option value="visible">Visible</option>
                      <option value="flagged">Flagged (reported)</option>
                      <option value="hidden">Hidden</option>
                    </Select>
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-sm text-body">
                    <input type="checkbox" name="reported" value="1" defaultChecked={filters.reportedOnly} className="size-4 accent-primary" />
                    Reported only
                  </label>
                  <div className="mt-4 flex items-center gap-3">
                    <Button type="submit" size="sm">
                      Apply
                    </Button>
                    <Link href={hrefFor(filters, { category: 'all', status: 'all', reportedOnly: false, q: '', page: 1 })} className="text-xs text-muted hover:text-ink">
                      Reset
                    </Link>
                  </div>
                </div>
              </details>

              <Button type="submit" variant="secondary">
                Search
              </Button>

              <details className="relative ml-auto">
                <summary
                  className={`${buttonClasses({ variant: 'secondary' })} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
                >
                  <Download aria-hidden className="size-4" />
                  Export CSV
                </summary>
                <ul className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-border bg-page p-1 shadow-lg">
                  {[
                    { label: 'Posts (CSV)', href: '/admin/export?type=posts&format=csv' },
                    { label: 'Replies (CSV)', href: '/admin/export?type=advices&format=csv' },
                  ].map((item) => (
                    <li key={item.href}>
                      {/* A plain anchor: this is a file download from a route handler, not a page. */}
                      <a href={item.href} download className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-sunken">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </form>
          </div>

          <ContentTable key={JSON.stringify(filters)} rows={rows} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft px-4 py-3 sm:px-6">
            <p className="text-sm text-muted">
              {list.total === 0
                ? 'No results'
                : `Showing ${shownFrom}–${shownTo} of ${list.total.toLocaleString('en-US')} items`}
            </p>
            <Pagination page={filters.page} totalPages={totalPages} hrefFor={(page) => hrefFor(filters, { page })} />
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
