import { Flag, MessageSquare, ShieldAlert, FileText } from 'lucide-react';
import { CategoryBars } from '@/components/admin/CategoryBars';
import { GrowthChart } from '@/components/admin/GrowthChart';
import { UrgentReports } from '@/components/admin/UrgentReports';
import { AdminShell } from '@/components/shell/AdminShell';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchDashboard, fetchReportsList, fetchStats } from '@/lib/admin/queries';
import { CATEGORIES } from '@/lib/categories';
import { todayLongDate, weekDelta } from '@/lib/present';

export const dynamic = 'force-dynamic';

const URGENT_SHOWN = 5;

export default async function DashboardPage() {
  await verifyAdmin();
  const [dashboard, urgent, stats] = await Promise.all([
    fetchDashboard(),
    fetchReportsList({ limit: URGENT_SHOWN }),
    fetchStats(30),
  ]);
  const { totals, week } = dashboard;

  // Every category is listed, including those with no posts yet, most posts first.
  const byCategory = CATEGORIES.map((c) => ({
    label: c.label,
    count: stats.by_category.find((row) => row.category === c.value)?.count ?? 0,
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return (
    <AdminShell crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Dashboard' }]} title="Platform Overview">
      <div className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-8">
        <h2 className="font-heading text-2xl leading-8 font-semibold text-ink">Welcome back, GistVeil Admin</h2>
        <p className="mt-1 text-sm text-muted">
          Monitoring platform health and community safety for {todayLongDate()}.
        </p>

        <section aria-label="Totals" className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Anonymous Advice"
            value={totals.advices.toLocaleString('en-US')}
            icon={<MessageSquare aria-hidden />}
            delta={weekDelta(week.advices[0], week.advices[1])}
          />
          <StatCard
            label="Total Posts"
            value={totals.posts.toLocaleString('en-US')}
            icon={<FileText aria-hidden />}
            delta={weekDelta(week.posts[0], week.posts[1])}
          />
          <StatCard
            label="Pending Reports"
            value={totals.open_reports.toLocaleString('en-US')}
            icon={<Flag aria-hidden />}
            delta={weekDelta(week.reports[0], week.reports[1])}
            deltaCaption="reports vs last week"
            lessIsBetter
          />
          <StatCard
            label="Failed sign-ins"
            value={totals.failed_signins_24h.toLocaleString('en-US')}
            icon={<ShieldAlert aria-hidden />}
            note="in the last 24 hours"
          />
        </section>

        {/* minmax(0,1fr) below xl too: an implicit `auto` track would size to the chart's width. */}
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_358px]">
          <Card className="p-6">
            <h2 className="font-heading text-lg leading-7 font-semibold text-ink">Community Growth</h2>
            <p className="mt-1 mb-5 text-sm text-muted">
              New content, new users and reports per day over the last 7 days.
            </p>
            <GrowthChart data={dashboard.daily} />
          </Card>
          <UrgentReports items={urgent.items} total={totals.open_reports} />
        </div>

        <Card className="mt-6 p-6">
          <h2 className="font-heading text-lg leading-7 font-semibold text-ink">Posts by category</h2>
          <p className="mt-1 mb-5 text-sm text-muted">All posts ever made, including hidden ones.</p>
          <CategoryBars rows={byCategory} />
        </Card>
      </div>
    </AdminShell>
  );
}
