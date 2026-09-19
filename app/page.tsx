import { PublicShell } from '@/components/shell/PublicShell';
import { AnnouncementBanner } from '@/components/site/AnnouncementBanner';
import { CategoryFilter } from '@/components/site/CategoryFilter';
import { FeedList } from '@/components/site/FeedList';
import { Hero } from '@/components/site/Hero';
import { NotFoundPanel } from '@/components/site/NotFoundPanel';
import { SidePanels } from '@/components/site/SidePanels';
import type { TrendingItem } from '@/components/site/SidePanels';
import { Card } from '@/components/ui/Card';
import { ANNOUNCEMENT_KEYS, visibleBanner } from '@/lib/announcement';
import { categoryLabel } from '@/lib/categories';
import { parseCategory, parseSearch, toFeedPosts } from '@/lib/feed';
import { fetchFeedPage } from '@/lib/feedQuery';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

const TRENDING_DAYS = 7;
const TRENDING_SHOWN = 4;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const q = parseSearch(params.q);

  const [feed, settings, popular] = await Promise.all([
    fetchFeedPage(supabase, { category, q }),
    supabase.from('settings').select('key, value').in('key', [...ANNOUNCEMENT_KEYS]),
    supabase.rpc('popular_categories', { p_days: TRENDING_DAYS }),
  ]);

  // A search with no matches shows the "Lost in the Veil" panel, and the latest posts (in the
  // same category) below it so the visitor is never left at a dead end.
  const noMatches = q !== '' && !feed.error && feed.total === 0;
  const list = noMatches ? await fetchFeedPage(supabase, { category }) : feed;

  // Errors are ignored on purpose for both: no settings table or no RPC (an un-migrated database)
  // simply means no banner and no Trending Topics card.
  const banner = settings.error ? null : visibleBanner(settings.data ?? []);
  const trending: TrendingItem[] | null = popular.error
    ? null
    : (popular.data ?? [])
        .flatMap((row: { category: string; n: number | string }) => {
          const known = parseCategory(row.category);
          return known ? [{ category: known, count: Number(row.n) }] : [];
        })
        .slice(0, TRENDING_SHOWN);

  return (
    <PublicShell crumbs={[{ label: 'GistVeil', href: '/' }, { label: 'Community Feed' }]} title="Discover Advice">
      {banner && (
        <div className="px-4 pt-4 sm:px-6">
          <div className="mx-auto max-w-[1088px]">
            <AnnouncementBanner title={banner.title} message={banner.message} theme={banner.theme} />
          </div>
        </div>
      )}

      <Hero />

      <div className="mx-auto w-full max-w-[1136px] px-4 pb-11 sm:px-6">
        <CategoryFilter category={category} q={q} />

        {noMatches && (
          <NotFoundPanel
            eyebrow="No results"
            description={`No posts${category ? ` in ${categoryLabel(category)}` : ''} match “${q}”. Try different words, or browse the latest posts below.`}
            searchDefault={q}
            secondary={{ label: 'Load more posts', href: '#latest' }}
          />
        )}

        <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          {list.error ? (
            <Card className="h-fit px-6 py-10 text-center text-muted">
              Couldn&apos;t load the feed. Try refreshing.
            </Card>
          ) : (
            <FeedList
              key={`${category ?? 'all'}|${noMatches ? '' : q}`}
              initialPosts={toFeedPosts(list.rows)}
              initialTotal={list.total}
              category={category}
              q={noMatches ? '' : q}
            />
          )}
          <SidePanels trending={trending} />
        </div>
      </div>
    </PublicShell>
  );
}
