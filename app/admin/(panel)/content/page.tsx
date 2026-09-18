import Link from 'next/link';
import { redirect } from 'next/navigation';
import { deleteContent, setHidden, setPinned } from '@/app/admin/actions/moderation';
import { ActionButton } from '@/components/admin/ActionButton';
import { BanButton } from '@/components/admin/BanButton';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchContent } from '@/lib/admin/queries';
import type { ContentFilters } from '@/lib/admin/types';
import { PAGE_SIZE, parsePage, pickOne } from '@/lib/admin/validate';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { timeAgo } from '@/lib/time';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

// Builds a link that keeps the current filters and overrides some of them.
function hrefFor(filters: ContentFilters, overrides: Partial<ContentFilters>): string {
  const f = { ...filters, ...overrides };
  const params = new URLSearchParams();
  params.set('kind', f.kind);
  if (f.q) params.set('q', f.q);
  if (f.kind === 'posts' && f.category !== 'all') params.set('category', f.category);
  if (f.status !== 'all') params.set('status', f.status);
  if (f.reportedOnly) params.set('reported', '1');
  if (f.page > 1) params.set('page', String(f.page));
  return `/admin/content?${params.toString()}`;
}

const inputClass =
  'rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-sm text-neutral-100';

export default async function ContentPage({ searchParams }: { searchParams: SearchParams }) {
  await verifyAdmin();

  const sp = await searchParams;
  const filters: ContentFilters = {
    kind: pickOne(first(sp.kind), ['posts', 'advices'] as const, 'posts'),
    q: (first(sp.q) ?? '').trim().slice(0, 100),
    category: pickOne(first(sp.category), ['all', ...CATEGORIES.map((c) => c.value)] as const, 'all'),
    status: pickOne(first(sp.status), ['all', 'visible', 'hidden'] as const, 'all'),
    reportedOnly: first(sp.reported) === '1',
    page: parsePage(first(sp.page)),
  };

  const { rows, total } = await fetchContent(filters);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // The requested page is past the end (a stale link, or the last item on the last page was
  // just deleted): send the viewer to the last page that exists.
  if (rows.length === 0 && total > 0) redirect(hrefFor(filters, { page: totalPages }));

  return (
    <main>
      <h1 className="mb-4 text-xl font-bold text-white">Content</h1>

      <div className="mb-4 flex gap-2">
        {(['posts', 'advices'] as const).map((kind) => (
          <Link
            key={kind}
            href={hrefFor(filters, { kind, category: 'all', page: 1 })}
            aria-current={filters.kind === kind ? 'page' : undefined}
            className={`rounded-full px-4 py-1.5 text-sm ${
              filters.kind === kind
                ? 'bg-purple-600 text-white'
                : 'border border-neutral-700 text-neutral-300 hover:border-purple-600'
            }`}
          >
            {kind === 'posts' ? 'Posts' : 'Advice'}
          </Link>
        ))}
      </div>

      <form method="get" action="/admin/content" className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="kind" value={filters.kind} />
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Search text
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            maxLength={100}
            placeholder="Search…"
            className={`${inputClass} w-48`}
          />
        </label>
        {filters.kind === 'posts' && (
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            Category
            <select name="category" defaultValue={filters.category} className={inputClass}>
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Status
          <select name="status" defaultValue={filters.status} className={inputClass}>
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-neutral-300">
          <input type="checkbox" name="reported" value="1" defaultChecked={filters.reportedOnly} />
          Reported only
        </label>
        <button
          type="submit"
          className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
        <Link
          href={`/admin/content?kind=${filters.kind}`}
          className="pb-2 text-sm text-neutral-400 hover:text-white"
        >
          Reset
        </Link>
      </form>

      <p className="mb-3 text-sm text-neutral-400">
        {total === 0
          ? 'No results'
          : `${total} result${total === 1 ? '' : 's'} · page ${filters.page} of ${totalPages}`}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-400">
          Nothing matches these filters.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={`${row.type}-${row.id}`}
              className={`rounded-lg border p-4 ${
                row.hidden ? 'border-amber-900 bg-neutral-950' : 'border-neutral-800 bg-neutral-900'
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-neutral-200">
                  {row.type === 'post' ? 'Post' : 'Advice'}
                </span>
                {row.hidden && (
                  <span className="rounded bg-amber-950 px-2 py-0.5 font-medium text-amber-300">
                    Hidden
                  </span>
                )}
                {row.pinnedAt && (
                  <span className="rounded bg-purple-950 px-2 py-0.5 font-medium text-purple-300">
                    Pinned
                  </span>
                )}
                {row.reportCount > 0 && (
                  <span className="rounded bg-red-950 px-2 py-0.5 font-medium text-red-300">
                    {row.reportCount} {row.reportCount === 1 ? 'report' : 'reports'}
                  </span>
                )}
                <span>{row.authorName}</span>
                <span>·</span>
                <span>{timeAgo(row.createdAt)}</span>
                {row.category && (
                  <span className="rounded bg-neutral-800 px-2 py-0.5">
                    {categoryLabel(row.category)}
                  </span>
                )}
                {row.upvotes !== undefined && <span>▲ {row.upvotes}</span>}
                <Link
                  href={`/post/${row.postId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-purple-400 hover:underline"
                >
                  {row.type === 'post' ? 'View post' : 'View thread'} ↗
                </Link>
              </div>

              <p className="break-words whitespace-pre-wrap text-neutral-100">{row.body}</p>

              <div className="mt-3 flex flex-wrap items-start gap-2">
                <ActionButton
                  action={setHidden.bind(null, row.type, row.id, !row.hidden)}
                  label={row.hidden ? 'Unhide' : 'Hide'}
                />
                {row.type === 'post' && (
                  <ActionButton
                    action={setPinned.bind(null, row.id, !row.pinnedAt)}
                    label={row.pinnedAt ? 'Unpin' : 'Pin'}
                  />
                )}
                <ActionButton
                  action={deleteContent.bind(null, row.type, row.id)}
                  label="Delete forever"
                  confirmLabel="Confirm delete"
                  tone="danger"
                />
                <BanButton anonUserId={row.authorId} authorName={row.authorName} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {filters.page > 1 ? (
            <Link
              href={hrefFor(filters, { page: filters.page - 1 })}
              className="rounded-full border border-neutral-700 px-4 py-1.5 text-neutral-200 hover:border-purple-600"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {filters.page < totalPages ? (
            <Link
              href={hrefFor(filters, { page: filters.page + 1 })}
              className="rounded-full border border-neutral-700 px-4 py-1.5 text-neutral-200 hover:border-purple-600"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
