import { CircleHelp, FileQuestion, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PublicShell } from '@/components/shell/PublicShell';
import { NotFoundPanel } from '@/components/site/NotFoundPanel';
import { Card } from '@/components/ui/Card';

// Where a lost visitor can go next. "Browse by Category" jumps to the feed's category tabs.
const pathways: { href: string; icon: ReactNode; title: string; text: string }[] = [
  {
    href: '/',
    icon: <MessageSquare aria-hidden />,
    title: 'Community Feed',
    text: 'Browse the latest anonymous advice threads.',
  },
  {
    href: '/post/new',
    icon: <FileQuestion aria-hidden />,
    title: 'Ask for Advice',
    text: 'Share your own situation and get support.',
  },
  {
    href: '/#categories',
    icon: <CircleHelp aria-hidden />,
    title: 'Browse by Category',
    text: 'Find advice by topic: relationships, money, family, work and more.',
  },
];

// Shown for a missing post and for any address the site does not have.
export default function NotFound() {
  return (
    <PublicShell crumbs={[{ label: 'GistVeil', href: '/' }, { label: 'Not Found' }]} title="Content Unavailable">
      <div className="mx-auto w-full max-w-[1072px] px-4 pt-[38px] pb-16 sm:px-6">
        <NotFoundPanel
          eyebrow="Error 404"
          description="The page you are looking for has been moved, hidden, or never existed in our community. Don't worry—the path back to safety is just a click away."
        />

        <hr className="mt-14 border-border" />

        <section aria-labelledby="pathways" className="mt-[47px]">
          <h2 id="pathways" className="text-center font-heading text-2xl leading-8 font-semibold text-ink">
            Suggested Pathways
          </h2>
          <ul className="mt-[34px] grid gap-[22px] md:grid-cols-3">
            {pathways.map((pathway) => (
              <li key={pathway.title} className="grid">
                <Link href={pathway.href} className="group block">
                  <Card outline={false} className="h-full p-[23px] transition-shadow group-hover:shadow-[0_6px_18px_rgb(20_20_40/0.1)]">
                    <span className="grid size-10 place-items-center rounded-xl bg-chip text-primary [&>svg]:size-5">
                      {pathway.icon}
                    </span>
                    <h3 className="mt-[14px] text-sm leading-5 font-medium text-ink">{pathway.title}</h3>
                    <p className="mt-[5px] text-sm leading-[23px] text-muted">{pathway.text}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PublicShell>
  );
}
