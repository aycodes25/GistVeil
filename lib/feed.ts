import { CATEGORIES, categoryLabel } from './categories';
import { splitPostText } from './present';
import { timeAgoLong } from './time';
import type { Category, Post } from './types';

export const FEED_PAGE_SIZE = 30;
export const SEARCH_MAX = 100;

// URL parameters can arrive as a string, a list (?q=a&q=b) or not at all; take the first value.
type Param = string | string[] | undefined;
const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

// Only the app's own categories filter the feed; anything else in the URL means "all".
export function parseCategory(value: Param): Category | undefined {
  const wanted = first(value);
  return CATEGORIES.find((c) => c.value === wanted)?.value;
}

// A search phrase from the URL: whitespace collapsed, trimmed and capped.
export function parseSearch(value: Param): string {
  return (first(value) ?? '').replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX);
}

// The feed URL for a filter, keeping only what is set.
export function feedHref({ category, q }: { category?: Category; q?: string }): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

// A post as the query returns it.
export type FeedRow = Post & { advices?: { count: number }[] };

// Everything a feed card shows, already formatted. The server builds these for the first page and
// the browser for later pages, so the card itself is a plain renderer (no clock of its own to
// disagree between server and browser).
export interface FeedPost {
  id: string;
  category: Category;
  categoryLabel: string;
  title: string;
  excerpt: string;
  authorName: string;
  timeLabel: string;
  pinned: boolean;
  replies: number;
}

// A card title reads as a headline, so a lone closing full stop is dropped ("…feels one-sided."
// becomes "…feels one-sided"). ? ! … and an ellipsis of dots stay. The post page shows the text whole.
export function headline(title: string): string {
  return title.replace(/(?<![.\s])\.$/, '');
}

export function toFeedPost(row: FeedRow, now: number = Date.now()): FeedPost {
  const { title, excerpt } = splitPostText(row.body);
  return {
    id: row.id,
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    title: headline(title),
    excerpt,
    authorName: row.anon_users?.anon_name ?? 'Anon',
    timeLabel: timeAgoLong(row.created_at, now),
    pinned: Boolean(row.pinned_at),
    replies: row.advices?.[0]?.count ?? 0,
  };
}

// A whole page of rows, every label stamped with the same moment.
export function toFeedPosts(rows: readonly FeedRow[], now: number = Date.now()): FeedPost[] {
  return rows.map((row) => toFeedPost(row, now));
}

// "Showing 4 results" when everything is on screen, "Showing 30 of 128 results" while more remain.
export function resultsLabel(shown: number, total: number): string {
  const noun = total === 1 ? 'result' : 'results';
  return shown < total ? `Showing ${shown} of ${total} ${noun}` : `Showing ${total} ${noun}`;
}
