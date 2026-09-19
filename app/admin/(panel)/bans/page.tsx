import { Ban, Clock, FileText, MessageSquareText } from 'lucide-react';
import { unbanDevice } from '@/app/admin/actions/moderation';
import { ActionButton } from '@/components/admin/ActionButton';
import { AdminShell } from '@/components/shell/AdminShell';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/Table';
import { verifyAdmin } from '@/lib/admin/auth';
import { summarizeBans } from '@/lib/admin/bans';
import { fetchBans } from '@/lib/admin/queries';
import { longDate } from '@/lib/present';

export const dynamic = 'force-dynamic';

export default async function BansPage() {
  await verifyAdmin();
  const bans = await fetchBans();
  const summary = summarizeBans(bans);

  return (
    <AdminShell crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Bans' }]} title="Restricted Identities">
      <div className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-8">
        <section aria-label="Totals" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Banned IDs" value={summary.total.toLocaleString('en-US')} icon={<Ban aria-hidden />} />
          <StatCard label="Banned in the last 30 days" value={summary.last30Days.toLocaleString('en-US')} icon={<Clock aria-hidden />} />
          <StatCard label="Posts and replies from banned IDs" value={summary.contentFromBanned.toLocaleString('en-US')} icon={<FileText aria-hidden />} />
          <StatCard label="Bans with a reason" value={summary.withReason.toLocaleString('en-US')} icon={<MessageSquareText aria-hidden />} />
        </section>

        <p className="mt-6 max-w-3xl text-sm leading-6 text-muted">
          A ban blocks a browser&apos;s stored identity from posting and replying. Someone who clears their site
          data gets a fresh identity, so treat a ban as a speed bump, not a wall. Unbanning does not unhide
          content; do that from the content library.
        </p>

        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-border-soft px-4 py-4 sm:px-6">
            <h2 className="font-heading text-lg font-semibold text-ink">All Bans</h2>
          </div>
          {bans.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-muted">No banned identities.</p>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Identity</Th>
                    <Th>Status</Th>
                    <Th>Violation reason</Th>
                    <Th>Details</Th>
                    <Th>Timeline</Th>
                    <Th className="text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {bans.map((ban) => (
                    <Tr key={ban.deviceToken}>
                      <Td>
                        <p className="font-medium">{ban.authorName ?? 'Unknown identity'}</p>
                        <p className="font-mono text-xs text-muted">{ban.deviceToken.slice(0, 8)}…</p>
                      </Td>
                      <Td>
                        <Badge tone="danger" size="xs">
                          Permanent
                        </Badge>
                      </Td>
                      <Td className="max-w-[16rem] text-sm text-body [overflow-wrap:anywhere]">
                        {ban.reason?.trim() ? ban.reason : <span className="text-muted">No reason recorded</span>}
                      </Td>
                      <Td className="text-sm whitespace-nowrap text-body">
                        {ban.postCount} {ban.postCount === 1 ? 'post' : 'posts'} · {ban.adviceCount}{' '}
                        {ban.adviceCount === 1 ? 'reply' : 'replies'}
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-muted">
                        <p>Banned: {longDate(new Date(ban.bannedAt))}</p>
                        <p>Indefinite duration</p>
                      </Td>
                      <Td className="text-right">
                        <ActionButton action={unbanDevice.bind(null, ban.deviceToken)} label="Unban" />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
