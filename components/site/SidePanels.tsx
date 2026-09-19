import { ArrowRight, MessageSquare, Shield, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { categoryLabel } from '@/lib/categories';
import { feedHref } from '@/lib/feed';
import type { Category } from '@/lib/types';

export interface TrendingItem {
  category: Category;
  count: number;
}

const norms: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <Shield aria-hidden />, title: 'Privacy First', text: "Don't ask for personal data." },
  { icon: <Sparkles aria-hidden />, title: 'Be Serene', text: 'Respectful dialogue only.' },
  { icon: <MessageSquare aria-hidden />, title: 'Constructive', text: "Give advice you'd want." },
];

// "Trending Topics" is real: the categories with the most posts over the last seven days, each
// linking to that category's tab. Pass `null` when the figures could not be loaded and the card
// is left out rather than showing something invented.
function TrendingTopics({ items }: { items: TrendingItem[] }) {
  return (
    <Card className="px-6 pt-6 pb-[18px]">
      <h3 className="flex items-center gap-2 font-heading text-[15px] leading-5 font-medium text-ink">
        <TrendingUp aria-hidden className="size-4 text-primary" />
        Trending Topics
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing yet this week. Be the first to post.</p>
      ) : (
        <ul className="mt-0.5">
          {items.map((item) => (
            <li key={item.category}>
              <Link
                href={feedHref({ category: item.category })}
                className="group flex items-center justify-between gap-3 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                <span>{categoryLabel(item.category)}</span>
                <span className="flex items-center gap-2 text-xs">
                  {item.count} {item.count === 1 ? 'post' : 'posts'}
                  <ArrowRight aria-hidden className="size-3.5 text-border-strong transition-colors group-hover:text-primary" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PromiseCard() {
  return (
    <Card tone="promise" className="relative overflow-hidden px-6 pt-6 pb-5">
      <ShieldCheck aria-hidden className="absolute top-4 right-4 size-16 text-primary/10" strokeWidth={1.5} />
      <h3 className="relative flex items-center gap-2 font-heading text-[15px] leading-5 font-semibold text-primary">
        <ShieldCheck aria-hidden className="size-4" />
        GistVeil Promise
      </h3>
      <p className="relative mt-3 max-w-[85%] text-xs leading-5 text-primary/80">
        Your anonymity is our priority. Posting needs no account, and we never ask who you are.
      </p>
    </Card>
  );
}

function CommunityNorms() {
  return (
    <Card className="px-6 pt-7 pb-6">
      <h3 className="text-[10px] leading-4 font-semibold tracking-[0.1em] text-ink uppercase">Community Norms</h3>
      <ul className="mt-4 space-y-4">
        {norms.map((norm) => (
          <li key={norm.title} className="flex items-start gap-3">
            <span className="mt-0.5 text-primary [&>svg]:size-4">{norm.icon}</span>
            <div>
              <p className="text-xs leading-4 font-semibold text-ink">{norm.title}</p>
              <p className="text-[11px] leading-4 text-muted">{norm.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SidePanels({ trending }: { trending: TrendingItem[] | null }) {
  return (
    <aside aria-label="About the community" className="flex flex-col gap-6">
      {trending && <TrendingTopics items={trending} />}
      <PromiseCard />
      <CommunityNorms />
    </aside>
  );
}
