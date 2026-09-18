import Link from 'next/link';
import { deleteContent, dismissReports, setHidden } from '@/app/admin/actions/moderation';
import { ActionButton } from '@/components/admin/ActionButton';
import { BanButton } from '@/components/admin/BanButton';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchOpenReports } from '@/lib/admin/queries';
import { categoryLabel } from '@/lib/categories';
import { timeAgo } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  await verifyAdmin();
  const { items, total } = await fetchOpenReports();

  return (
    <main>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-white">Reports</h1>
        <p className="text-sm text-neutral-400">
          {total === 0 ? 'Nothing to review' : `Showing top ${items.length} of ${total} open`}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-400">
          No open reports. Nice.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-neutral-200">
                  {item.type === 'post' ? 'Post' : 'Advice'}
                </span>
                <span className="rounded bg-red-950 px-2 py-0.5 font-medium text-red-300">
                  {item.reportCount} {item.reportCount === 1 ? 'report' : 'reports'}
                </span>
                <span>{item.authorName}</span>
                <span>·</span>
                <span>{timeAgo(item.createdAt)}</span>
                {item.category && (
                  <span className="rounded bg-neutral-800 px-2 py-0.5">
                    {categoryLabel(item.category)}
                  </span>
                )}
                <Link
                  href={`/post/${item.postId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-purple-400 hover:underline"
                >
                  {item.type === 'post' ? 'View post' : 'View thread'} ↗
                </Link>
              </div>

              <p className="break-words whitespace-pre-wrap text-neutral-100">{item.body}</p>

              <div className="mt-3 flex flex-wrap items-start gap-2">
                <ActionButton
                  action={dismissReports.bind(null, item.type, item.id)}
                  label="Dismiss reports"
                />
                <ActionButton action={setHidden.bind(null, item.type, item.id, true)} label="Hide" />
                <ActionButton
                  action={deleteContent.bind(null, item.type, item.id)}
                  label="Delete forever"
                  confirmLabel="Confirm delete"
                  tone="danger"
                />
                <BanButton anonUserId={item.authorId} authorName={item.authorName} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
