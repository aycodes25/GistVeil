import { supabase } from '@/lib/supabaseClient';
import { PostCard } from '@/components/PostCard';
import { CategoryTabs } from '@/components/CategoryTabs';
import type { Category, Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category as Category | undefined;

  // Pinned posts first, then newest. If the admin migration (supabase/admin.sql) hasn't been
  // run yet, `pinned_at` doesn't exist and PostgREST answers 42703 (undefined column): fall
  // back to plain newest-first so an un-migrated database never blanks the public feed.
  function feedQuery(withPins: boolean) {
    let query = supabase.from('posts').select('*, anon_users(anon_name), advices(count)');
    if (withPins) query = query.order('pinned_at', { ascending: false, nullsFirst: false });
    query = query.order('created_at', { ascending: false }).limit(30);
    if (activeCategory) query = query.eq('category', activeCategory);
    return query;
  }

  const [feed, announcementResult] = await Promise.all([
    feedQuery(true),
    // Errors are ignored on purpose: no settings table (or no row) simply means no banner.
    supabase.from('settings').select('value').eq('key', 'announcement').maybeSingle(),
  ]);
  let { data, error } = feed;
  if (error?.code === '42703') {
    ({ data, error } = await feedQuery(false));
  }
  const announcement = announcementResult.data?.value?.trim();

  const posts: Post[] = (data ?? []).map((p: any) => ({
    ...p,
    advice_count: p.advices?.[0]?.count ?? 0,
  }));

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">GistVeil</h1>
        <a
          href="/post/new"
          className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white"
        >
          Post
        </a>
      </div>
      {announcement && (
        <div
          role="note"
          className="mb-4 rounded-lg border border-purple-800 bg-purple-950/50 px-4 py-3 text-sm whitespace-pre-wrap text-purple-100"
        >
          {announcement}
        </div>
      )}
      <CategoryTabs active={activeCategory ?? 'all'} />
      {error && (
        <p className="mt-4 text-red-400">Couldn&apos;t load the feed. Try refreshing.</p>
      )}
      <div className="mt-4 flex flex-col gap-3">
        {posts.length === 0 && !error && (
          <p className="text-neutral-400">No posts yet. Be the first.</p>
        )}
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  );
}
