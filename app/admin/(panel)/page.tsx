import { ActivityChart } from '@/components/admin/ActivityChart';
import { CategoryBars } from '@/components/admin/CategoryBars';
import { StatTile } from '@/components/admin/StatTile';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchStats } from '@/lib/admin/queries';
import { CATEGORIES } from '@/lib/categories';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 30;

export default async function DashboardPage() {
  await verifyAdmin();
  const stats = await fetchStats(WINDOW_DAYS);
  const { totals } = stats;

  const inWindow = stats.daily.reduce(
    (sum, d) => ({
      posts: sum.posts + d.posts,
      advices: sum.advices + d.advices,
      users: sum.users + d.new_users,
    }),
    { posts: 0, advices: 0, users: 0 },
  );

  // Every category is listed, including those with no posts yet, sorted by count.
  const byCategory = CATEGORIES.map((c) => ({
    label: c.label,
    count: stats.by_category.find((row) => row.category === c.value)?.count ?? 0,
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const hiddenTotal = totals.hidden_posts + totals.hidden_advices;

  return (
    <main>
      <h1 className="mb-4 text-xl font-bold text-white">Dashboard</h1>

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Posts" value={totals.posts} note={`${inWindow.posts} in ${WINDOW_DAYS} days`} />
        <StatTile
          label="Advice"
          value={totals.advices}
          note={`${inWindow.advices} in ${WINDOW_DAYS} days`}
        />
        <StatTile
          label="Anonymous users"
          value={totals.anon_users}
          note={`${inWindow.users} in ${WINDOW_DAYS} days`}
        />
        <StatTile
          label="Open reports"
          value={totals.open_reports}
          note={totals.open_reports > 0 ? 'Needs review' : 'All clear'}
          href="/admin/reports"
        />
        <StatTile
          label="Hidden items"
          value={hiddenTotal}
          note={`${totals.hidden_posts} posts · ${totals.hidden_advices} advice`}
          href="/admin/content?status=hidden"
        />
        <StatTile label="Banned devices" value={totals.banned_devices} href="/admin/bans" />
      </section>

      <section className="viz-root mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-base font-semibold text-white">
          Activity, last {WINDOW_DAYS} days
        </h2>
        <ActivityChart data={stats.daily} />
      </section>

      <section className="viz-root mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-base font-semibold text-white">Posts by category</h2>
        <CategoryBars rows={byCategory} />
        <p className="mt-3 text-xs text-neutral-500">Includes hidden posts.</p>
      </section>
    </main>
  );
}
