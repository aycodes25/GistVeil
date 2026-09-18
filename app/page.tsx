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

  let query = supabase
    .from('posts')
    .select('*, anon_users(anon_name), advices(count)')
    .order('created_at', { ascending: false })
    .limit(30);

  if (activeCategory) {
    query = query.eq('category', activeCategory);
  }

  const { data, error } = await query;

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
