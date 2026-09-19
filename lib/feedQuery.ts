import type { SupabaseClient } from '@supabase/supabase-js';
import { FEED_PAGE_SIZE } from './feed';
import type { FeedRow } from './feed';
import { escapeLike } from './like';
import type { Category } from './types';

export interface FeedPage {
  rows: FeedRow[];
  /** Every post matching the filter, not just this page. */
  total: number;
  error: boolean;
}

// One page of the feed: pinned posts first, then newest. Used by the server for the first page and
// by the browser for "View More Posts", always with the anon client, so row-level security decides
// what is visible either way.
export async function fetchFeedPage(
  client: SupabaseClient,
  { category, q, offset = 0 }: { category?: Category; q?: string; offset?: number },
): Promise<FeedPage> {
  function build(withPins: boolean) {
    let query = client
      .from('posts')
      .select('*, anon_users(anon_name), advices(count)', { count: 'exact' });
    if (withPins) query = query.order('pinned_at', { ascending: false, nullsFirst: false });
    query = query.order('created_at', { ascending: false }).range(offset, offset + FEED_PAGE_SIZE - 1);
    if (category) query = query.eq('category', category);
    if (q) query = query.ilike('body', `%${escapeLike(q)}%`);
    return query;
  }

  let { data, count, error } = await build(true);
  // If the admin migration (supabase/admin.sql) hasn't been run yet, `pinned_at` doesn't exist and
  // PostgREST answers 42703 (undefined column): fall back to plain newest-first so an un-migrated
  // database never blanks the public feed.
  if (error?.code === '42703') ({ data, count, error } = await build(false));

  // Asking for a page past the end (posts were removed since the last page loaded) is 416 /
  // PGRST103: that just means there is nothing more.
  if (error?.code === 'PGRST103') return { rows: [], total: offset, error: false };

  if (error) return { rows: [], total: 0, error: true };
  const rows = (data ?? []) as unknown as FeedRow[];
  return { rows, total: count ?? offset + rows.length, error: false };
}
