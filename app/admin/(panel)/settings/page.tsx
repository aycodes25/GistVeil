import {
  AnnouncementForm,
  BlockedWordList,
  BlockedWordsForm,
} from '@/components/admin/SettingsForms';
import { verifyAdmin } from '@/lib/admin/auth';
import { fetchSettings } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

const card = 'rounded-lg border border-neutral-800 bg-neutral-900 p-4';

const EXPORTS = [
  { label: 'Posts (JSON)', href: '/admin/export?type=posts&format=json' },
  { label: 'Posts (CSV)', href: '/admin/export?type=posts&format=csv' },
  { label: 'Advice (JSON)', href: '/admin/export?type=advices&format=json' },
  { label: 'Advice (CSV)', href: '/admin/export?type=advices&format=csv' },
];

export default async function SettingsPage() {
  await verifyAdmin();
  const { announcement, blockedWords } = await fetchSettings();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      <section className={card}>
        <h2 className="text-base font-semibold text-white">Announcement</h2>
        <p className="mt-1 mb-3 text-sm text-neutral-400">
          Shown as a banner above the feed for every visitor.
        </p>
        <AnnouncementForm current={announcement} />
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold text-white">Blocked words</h2>
        <p className="mt-1 mb-3 max-w-2xl text-sm text-neutral-400">
          Posts and replies containing any of these are refused, on top of the built-in list.
          Matching is case-insensitive and by substring, so a short word can also catch harmless
          text. The filter runs in the visitor&apos;s browser, so this list is readable by anyone
          with the site&apos;s public API key.
        </p>
        <BlockedWordsForm />
        <div className="mt-4">
          <BlockedWordList words={blockedWords} />
        </div>
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold text-white">Export</h2>
        <p className="mt-1 mb-3 max-w-2xl text-sm text-neutral-400">
          Download every post or advice, including hidden ones and their report counts. Device
          tokens are never included. In the CSV, text that starts with = + - or @ is prefixed with
          an apostrophe so a spreadsheet won&apos;t run it as a formula.
        </p>
        <ul className="flex flex-wrap gap-2">
          {EXPORTS.map((item) => (
            <li key={item.href}>
              {/* A plain anchor: this is a file download from a route handler, not a page. */}
              <a
                href={item.href}
                download
                className="inline-block rounded-full border border-neutral-700 px-4 py-1.5 text-sm text-neutral-200 hover:border-purple-600"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
