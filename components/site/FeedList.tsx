'use client';

import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { categoryLabel } from '@/lib/categories';
import { resultsLabel, toFeedPosts } from '@/lib/feed';
import type { FeedPost } from '@/lib/feed';
import { fetchFeedPage } from '@/lib/feedQuery';
import { supabase } from '@/lib/supabaseClient';
import type { Category } from '@/lib/types';
import { PostCard } from './PostCard';

// "Latest Conversations": the posts the server rendered, plus a "View More Posts" button that
// fetches the next page in the browser. The page keys this component by its filter, so changing
// the category or search starts it afresh.
export function FeedList({
  initialPosts,
  initialTotal,
  category,
  q,
}: {
  initialPosts: FeedPost[];
  initialTotal: number;
  category?: Category;
  q?: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  // How many rows the server-side ordering has handed out so far. Kept apart from posts.length
  // because a post that appears twice (new posts shift the pages) is dropped from the list.
  const [offset, setOffset] = useState(initialPosts.length);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [announcement, setAnnouncement] = useState('');

  const hasMore = offset < total;

  async function loadMore() {
    setStatus('loading');
    const page = await fetchFeedPage(supabase, { category, q, offset });
    if (page.error) {
      setStatus('error');
      return;
    }
    const seen = new Set(posts.map((post) => post.id));
    const fresh = toFeedPosts(page.rows.filter((row) => !seen.has(row.id)));
    setPosts([...posts, ...fresh]);
    setTotal(page.total);
    setOffset(offset + page.rows.length);
    setStatus('idle');
    setAnnouncement(`Loaded ${fresh.length} more ${fresh.length === 1 ? 'post' : 'posts'}.`);
  }

  return (
    <section id="latest" className="scroll-mt-32 md:scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-2xl font-semibold text-ink">Latest Conversations</h2>
          {posts.length > 0 && (
            <span className="rounded-full bg-pill px-2 py-0.5 text-[11px] leading-4 font-medium text-muted">
              {resultsLabel(posts.length, total)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted md:pr-14">
          Sort by: <span className="ml-1 text-[13px] font-medium text-ink">Recent</span>
        </p>
      </div>

      {posts.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-4 px-6 py-14 text-center">
          <p className="text-muted">
            {category ? `No posts in ${categoryLabel(category)} yet.` : 'No posts yet. Be the first.'}
          </p>
          <ButtonLink href="/post/new">Share Your Story</ButtonLink>
        </Card>
      ) : (
        <ul className="mt-8 grid gap-x-6 gap-y-[26px] sm:grid-cols-2">
          {posts.map((post) => (
            // A grid item stretches its card, so cards in one row are the same height.
            <li key={post.id} className="grid">
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="mt-14 flex flex-col items-center gap-2">
          <Button variant="ghost" size="lg" onClick={loadMore} disabled={status === 'loading'}>
            View More Posts
            {status === 'loading' ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <ArrowRight aria-hidden className="size-4" />
            )}
          </Button>
          {status === 'error' && (
            <p role="alert" className="text-sm text-danger">
              Couldn&apos;t load more posts. Try again.
            </p>
          )}
        </div>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
