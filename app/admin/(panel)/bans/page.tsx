import { unbanDevice } from '@/app/admin/actions/moderation';
import { ActionButton } from '@/components/admin/ActionButton';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchBans } from '@/lib/admin/queries';
import { timeAgo } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function BansPage() {
  await verifyAdmin();
  const bans = await fetchBans();

  return (
    <main>
      <h1 className="text-xl font-bold text-white">Banned devices</h1>
      <p className="mt-1 mb-4 max-w-2xl text-sm text-neutral-400">
        A ban blocks a browser&apos;s stored identity from posting and replying. Someone who clears
        their site data gets a fresh identity, so treat a ban as a speed bump, not a wall.
        Unbanning does not unhide content; do that from the content browser.
      </p>

      {bans.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-400">
          No banned devices.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bans.map((ban) => (
            <li
              key={ban.deviceToken}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-neutral-100">
                    {ban.authorName ?? 'Unknown identity'}
                  </span>
                  <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-400">
                    {ban.deviceToken.slice(0, 8)}…
                  </span>
                  <span className="text-xs text-neutral-400">banned {timeAgo(ban.bannedAt)}</span>
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  {ban.reason ? `Reason: ${ban.reason}` : 'No reason recorded'} · {ban.postCount}{' '}
                  {ban.postCount === 1 ? 'post' : 'posts'} · {ban.adviceCount}{' '}
                  {ban.adviceCount === 1 ? 'reply' : 'replies'}
                </p>
              </div>
              <ActionButton action={unbanDevice.bind(null, ban.deviceToken)} label="Unban" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
