import { Database, Download, Megaphone, ShieldCheck } from 'lucide-react';
import { BannerForm, BlockedWordList, BlockedWordsForm } from '@/components/admin/SettingsForms';
import { AdminShell } from '@/components/shell/AdminShell';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchDashboard, fetchSettings } from '@/lib/admin/queries';
import { pickOne } from '@/lib/admin/validate';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const TABS = ['announcements', 'filters', 'data'] as const;

const EXPORTS = [
  { label: 'Posts (JSON)', href: '/admin/export?type=posts&format=json' },
  { label: 'Posts (CSV)', href: '/admin/export?type=posts&format=csv' },
  { label: 'Advice (JSON)', href: '/admin/export?type=advices&format=json' },
  { label: 'Advice (CSV)', href: '/admin/export?type=advices&format=csv' },
];

function latencyVerdict(ms: number): { label: string; tone: BadgeTone } {
  if (ms < 150) return { label: 'Excellent', tone: 'success' };
  if (ms < 500) return { label: 'Good', tone: 'info' };
  return { label: 'Slow', tone: 'warning' };
}

function Tile({ label, value, badge }: { label: string; value: string; badge: { label: string; tone: BadgeTone } }) {
  return (
    <Card className="px-4 py-6 text-center">
      <p className="text-xs font-semibold tracking-[0.1em] text-muted uppercase">{label}</p>
      <p className="mt-3 font-heading text-3xl leading-none font-semibold text-ink">{value}</p>
      <Badge tone={badge.tone} size="xs" className="mt-4">
        {badge.label}
      </Badge>
    </Card>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await verifyAdmin();

  const sp = await searchParams;
  const tab = pickOne(first(sp.tab), TABS, 'announcements');
  const [settings, dashboard] = await Promise.all([fetchSettings(), fetchDashboard()]);
  const { totals } = dashboard;

  const tabs = [
    { label: <span className="inline-flex items-center gap-2"><Megaphone aria-hidden className="size-4" />Announcements</span>, href: '/admin/settings', active: tab === 'announcements' },
    { label: <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden className="size-4" />Content Filters</span>, href: '/admin/settings?tab=filters', active: tab === 'filters' },
    { label: <span className="inline-flex items-center gap-2"><Database aria-hidden className="size-4" />Data Management</span>, href: '/admin/settings?tab=data', active: tab === 'data' },
  ];

  const latency = latencyVerdict(settings.dbMs);

  return (
    <AdminShell crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Settings' }]} title="System Settings">
      <div
        className="relative isolate overflow-hidden px-4 py-9 sm:px-8"
        style={{
          backgroundImage:
            'linear-gradient(100deg, var(--color-page) 0%, var(--color-chip) 42%, color-mix(in srgb, var(--color-ink) 86%, var(--color-primary)) 100%)',
        }}
      >
        <div aria-hidden className="absolute top-[-40%] right-[8%] -z-10 size-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="mx-auto w-full max-w-[1184px]">
          <Badge tone="primary" className="border border-primary/20">
            System Configuration
          </Badge>
          <h2 className="mt-3 font-heading text-4xl leading-tight font-semibold tracking-[-0.01em] text-ink">Admin Control Room</h2>
          <p className="mt-2 max-w-xl text-base leading-7 text-body">
            Manage the site-wide banner, the community safety filters, and export your data.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-8">
        <Tabs items={tabs} label="Settings sections" />

        {tab === 'announcements' && (
          <section className="mt-8" aria-labelledby="announcements-heading">
            <h2 id="announcements-heading" className="font-heading text-2xl font-semibold text-ink">
              Global Announcements
            </h2>
            <p className="mt-1 mb-5 text-sm text-muted">Configure the site-wide banner visible to all community members.</p>
            <Card className="overflow-hidden">
              <BannerForm current={settings.banner} />
            </Card>
          </section>
        )}

        {tab === 'filters' && (
          <section className="mt-8" aria-labelledby="filters-heading">
            <h2 id="filters-heading" className="font-heading text-2xl font-semibold text-ink">
              Content Filters
            </h2>
            <p className="mt-1 mb-5 max-w-2xl text-sm leading-6 text-muted">
              Posts and replies containing any of these are refused, on top of the built-in list. Matching is
              case-insensitive and by substring, so a short word can also catch harmless text. The filter runs in
              the visitor&apos;s browser, so this list is readable by anyone with the site&apos;s public API key.
            </p>
            <Card className="p-6">
              <BlockedWordsForm />
              <div className="mt-6 border-t border-border-soft pt-5">
                <BlockedWordList words={settings.blockedWords} />
              </div>
            </Card>
          </section>
        )}

        {tab === 'data' && (
          <section className="mt-8" aria-labelledby="data-heading">
            <h2 id="data-heading" className="font-heading text-2xl font-semibold text-ink">
              Data Management
            </h2>
            <p className="mt-1 mb-5 max-w-2xl text-sm leading-6 text-muted">
              Download every post or advice, including hidden ones and their report counts. Device tokens are never
              included. In the CSV, text that starts with = + - or @ is prefixed with an apostrophe so a spreadsheet
              won&apos;t run it as a formula.
            </p>
            <Card className="p-6">
              <ul className="flex flex-wrap gap-3">
                {EXPORTS.map((item) => (
                  <li key={item.href}>
                    {/* A plain anchor: this is a file download from a route handler, not a page. */}
                    <a href={item.href} download className={buttonClasses({ variant: 'secondary' })}>
                      <Download aria-hidden className="size-4" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        <section className="mt-12 border-t border-border pt-10" aria-labelledby="integrity-heading">
          <h2 id="integrity-heading" className="font-heading text-2xl font-semibold text-ink">
            System Integrity
          </h2>
          <p className="mt-1 mb-5 text-sm text-muted">Live figures from the database, measured on this page load.</p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Database connection" value={`${settings.dbMs}ms`} badge={latency} />
            <Tile
              label="Open reports"
              value={totals.open_reports.toLocaleString('en-US')}
              badge={totals.open_reports === 0 ? { label: 'Queue clear', tone: 'success' } : { label: 'Needs review', tone: 'warning' }}
            />
            <Tile
              label="Blocked words"
              value={settings.blockedWords.length.toLocaleString('en-US')}
              badge={{ label: 'Plus the built-in list', tone: 'neutral' }}
            />
            <Tile
              label="Banned identities"
              value={totals.banned_devices.toLocaleString('en-US')}
              badge={{ label: 'Permanent bans', tone: 'neutral' }}
            />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
