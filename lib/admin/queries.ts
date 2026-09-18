import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from './client';
import type { AdminStats, BanRow, ContentFilters, ContentRow, ReportItem } from './types';
import { PAGE_SIZE, escapeLike } from './validate';
import type { Category } from '../types';

// Server-side reads for the admin pages. Every function obtains its client through
// getAdminClient(), which verifies the admin session first. Errors are thrown so the
// panel's error boundary shows them; the message goes to the server log, not the browser.

export const REPORT_QUEUE_LIMIT = 50;

type AuthorEmbed = { anon_name: string } | { anon_name: string }[] | null;

interface ReportedPostRow {
  id: string;
  body: string;
  category: Category;
  report_count: number;
  created_at: string;
  anon_user_id: string;
  anon_users: AuthorEmbed;
}

interface ReportedAdviceRow {
  id: string;
  post_id: string;
  body: string;
  report_count: number;
  created_at: string;
  anon_user_id: string;
  anon_users: AuthorEmbed;
}

// PostgREST returns a many-to-one embed as an object; tolerate an array too.
function authorName(embed: AuthorEmbed): string {
  const author = Array.isArray(embed) ? embed[0] : embed;
  return author?.anon_name ?? 'Anon';
}

// Reported, not-hidden posts and advice merged into one list, most-reported first.
// `total` is the full count of open reports, which can exceed the number shown.
export async function fetchOpenReports(
  limit: number = REPORT_QUEUE_LIMIT,
): Promise<{ items: ReportItem[]; total: number }> {
  const db = await getAdminClient();

  const [posts, advices] = await Promise.all([
    db
      .from('posts')
      .select('id, body, category, report_count, created_at, anon_user_id, anon_users(anon_name)', {
        count: 'exact',
      })
      .gt('report_count', 0)
      .eq('hidden', false)
      .order('report_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('advices')
      .select(
        'id, post_id, body, report_count, created_at, anon_user_id, anon_users(anon_name)',
        { count: 'exact' },
      )
      .gt('report_count', 0)
      .eq('hidden', false)
      .order('report_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  if (posts.error) throw new Error(`Loading reported posts failed: ${posts.error.message}`);
  if (advices.error) throw new Error(`Loading reported advice failed: ${advices.error.message}`);

  const postItems: ReportItem[] = ((posts.data ?? []) as unknown as ReportedPostRow[]).map((row) => ({
    type: 'post',
    id: row.id,
    body: row.body,
    reportCount: row.report_count,
    createdAt: row.created_at,
    authorId: row.anon_user_id,
    authorName: authorName(row.anon_users),
    category: row.category,
    postId: row.id,
  }));

  const adviceItems: ReportItem[] = ((advices.data ?? []) as unknown as ReportedAdviceRow[]).map(
    (row) => ({
      type: 'advice',
      id: row.id,
      body: row.body,
      reportCount: row.report_count,
      createdAt: row.created_at,
      authorId: row.anon_user_id,
      authorName: authorName(row.anon_users),
      postId: row.post_id,
    }),
  );

  const items = [...postItems, ...adviceItems]
    .sort((a, b) => b.reportCount - a.reportCount || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return { items, total: (posts.count ?? 0) + (advices.count ?? 0) };
}

interface ContentPostRow {
  id: string;
  body: string;
  category: Category;
  report_count: number;
  hidden: boolean;
  pinned_at: string | null;
  created_at: string;
  anon_user_id: string;
  anon_users: AuthorEmbed;
}

interface ContentAdviceRow {
  id: string;
  post_id: string;
  body: string;
  upvotes: number;
  report_count: number;
  hidden: boolean;
  created_at: string;
  anon_user_id: string;
  anon_users: AuthorEmbed;
}

// One page of posts or advice for the content browser. `total` is the count of all rows
// matching the filters, so the page can show how many pages there are.
export async function fetchContent(
  filters: ContentFilters,
): Promise<{ rows: ContentRow[]; total: number }> {
  const db = await getAdminClient();
  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const columns =
    filters.kind === 'posts'
      ? 'id, body, category, report_count, hidden, pinned_at, created_at, anon_user_id, anon_users(anon_name)'
      : 'id, post_id, body, upvotes, report_count, hidden, created_at, anon_user_id, anon_users(anon_name)';

  // Built twice when needed: once for the page of rows, and (only if the requested page is
  // past the end) once as a head-only count to learn the real total.
  function build(head: boolean) {
    let request = db
      .from(filters.kind)
      .select(head ? 'id' : columns, { count: 'exact', head });

    if (filters.q) request = request.ilike('body', `%${escapeLike(filters.q)}%`);
    if (filters.kind === 'posts' && filters.category !== 'all') {
      request = request.eq('category', filters.category);
    }
    if (filters.status === 'visible') request = request.eq('hidden', false);
    if (filters.status === 'hidden') request = request.eq('hidden', true);
    if (filters.reportedOnly) request = request.gt('report_count', 0);
    return request;
  }

  // `id` breaks ties so offset paging stays stable when timestamps collide.
  const { data, error, count } = await build(false)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    // PostgREST answers 416 (PGRST103) when the offset is past the last row, e.g. after the
    // last item on the last page was deleted. That is not a failure: report the true total
    // with no rows so the page can send the viewer to the last real page.
    if (error.code === 'PGRST103') {
      const { count: total, error: countError } = await build(true);
      if (countError) throw new Error(`Loading content failed: ${countError.message}`);
      return { rows: [], total: total ?? 0 };
    }
    throw new Error(`Loading content failed: ${error.message}`);
  }

  const rows: ContentRow[] =
    filters.kind === 'posts'
      ? ((data ?? []) as unknown as ContentPostRow[]).map((row) => ({
          type: 'post',
          id: row.id,
          body: row.body,
          createdAt: row.created_at,
          authorId: row.anon_user_id,
          authorName: authorName(row.anon_users),
          reportCount: row.report_count,
          hidden: row.hidden,
          postId: row.id,
          category: row.category,
          pinnedAt: row.pinned_at,
        }))
      : ((data ?? []) as unknown as ContentAdviceRow[]).map((row) => ({
          type: 'advice',
          id: row.id,
          body: row.body,
          createdAt: row.created_at,
          authorId: row.anon_user_id,
          authorName: authorName(row.anon_users),
          reportCount: row.report_count,
          hidden: row.hidden,
          postId: row.post_id,
          upvotes: row.upvotes,
        }));

  return { rows, total: count ?? 0 };
}

interface BanQueryRow {
  device_token: string;
  reason: string | null;
  banned_at: string;
  anon_user_id: string | null;
  anon_name: string | null;
  post_count: number | string;
  advice_count: number | string;
}

export async function fetchBans(): Promise<BanRow[]> {
  const db = await getAdminClient();
  const { data, error } = await db.rpc('admin_bans');
  if (error) throw new Error(`Loading bans failed: ${error.message}`);

  return ((data ?? []) as BanQueryRow[]).map((row) => ({
    deviceToken: row.device_token,
    reason: row.reason,
    bannedAt: row.banned_at,
    authorId: row.anon_user_id,
    authorName: row.anon_name,
    // bigint counts can arrive as strings depending on the client; normalise to numbers.
    postCount: Number(row.post_count),
    adviceCount: Number(row.advice_count),
  }));
}

// Everything the dashboard shows, in one round trip. Computed in SQL (admin_stats) because
// the Supabase API caps responses at 1000 rows, which would make counting in JS undercount.
export async function fetchStats(days: number = 30): Promise<AdminStats> {
  const db = await getAdminClient();
  const { data, error } = await db.rpc('admin_stats', { p_days: days });
  if (error) throw new Error(`Loading stats failed: ${error.message}`);
  return data as AdminStats;
}

// Current announcement text ("" when none) and the blocked-words list, for the settings page.
export async function fetchSettings(): Promise<{ announcement: string; blockedWords: string[] }> {
  const db = await getAdminClient();
  const [announcement, words] = await Promise.all([
    db.from('settings').select('value').eq('key', 'announcement').maybeSingle(),
    db.from('blocked_words').select('word').order('word', { ascending: true }),
  ]);

  if (announcement.error) throw new Error(`Loading the announcement failed: ${announcement.error.message}`);
  if (words.error) throw new Error(`Loading blocked words failed: ${words.error.message}`);

  return {
    announcement: (announcement.data?.value as string | undefined) ?? '',
    blockedWords: (words.data ?? []).map((row) => String(row.word)),
  };
}

// ---- Data export -------------------------------------------------------------------------

export const EXPORT_PAGE_SIZE = 1000; // matches the API's default 1000-row response cap

// The columns of each export, in order. `device_token` is deliberately absent: it is the
// closest thing to a stable per-person identifier the database holds, and nobody needs it in
// a file that is easy to leak. `author` is the anonymous display name.
export const EXPORT_COLUMNS = {
  posts: ['id', 'created_at', 'category', 'body', 'report_count', 'hidden', 'pinned_at', 'anon_user_id', 'author'],
  advices: ['id', 'post_id', 'created_at', 'body', 'upvotes', 'report_count', 'hidden', 'anon_user_id', 'author'],
} as const;

export type ExportKind = keyof typeof EXPORT_COLUMNS;
export type ExportRow = Record<string, string | number | boolean | null>;

// One page of an export, oldest first. The caller passes the client (obtained once, via
// getAdminClient(), before streaming starts) because request-scoped helpers such as cookies()
// are not reliably available inside a stream callback after the handler has returned.
export async function fetchExportPage(
  db: SupabaseClient,
  kind: ExportKind,
  offset: number,
): Promise<ExportRow[]> {
  const columns =
    kind === 'posts'
      ? 'id, created_at, category, body, report_count, hidden, pinned_at, anon_user_id, anon_users(anon_name)'
      : 'id, post_id, created_at, body, upvotes, report_count, hidden, anon_user_id, anon_users(anon_name)';

  const { data, error } = await db
    .from(kind)
    .select(columns)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + EXPORT_PAGE_SIZE - 1);

  if (error) {
    // 416 / PGRST103: the offset is past the last row. This happens when the total is an
    // exact multiple of the page size, and it just means "no more rows".
    if (error.code === 'PGRST103') return [];
    throw new Error(`Loading export data failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as Array<Record<string, unknown> & { anon_users: AuthorEmbed }>).map(
    ({ anon_users, ...row }) => ({ ...row, author: authorName(anon_users) }) as ExportRow,
  );
}
