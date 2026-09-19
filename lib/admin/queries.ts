import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from './client';
import { ANNOUNCEMENT_KEYS, parseBanner, type Banner } from '../announcement';
import type { AdminDashboard, AdminStats, BanRow, ContentFilters, ContentRow, ReportRow } from './types';
import { PAGE_SIZE, escapeLike } from './validate';
import type { Category } from '../types';

// Server-side reads for the admin pages. Every function obtains its client through
// getAdminClient(), which verifies the admin session first. Errors are thrown so the
// panel's error boundary shows them; the message goes to the server log, not the browser.

type AuthorEmbed = { anon_name: string } | { anon_name: string }[] | null;

// PostgREST returns a many-to-one embed as an object; tolerate an array too.
function authorName(embed: AuthorEmbed): string {
  const author = Array.isArray(embed) ? embed[0] : embed;
  return author?.anon_name ?? 'Anon';
}

interface ContentListRow {
  item_type: 'post' | 'advice';
  id: string;
  post_id: string;
  body: string;
  category: Category | null;
  author_id: string;
  author_name: string | null;
  report_count: number;
  hidden: boolean;
  pinned_at: string | null;
  upvotes: number | null;
  created_at: string;
  total_count: number | string;
}

// One page of posts and/or replies with the filters applied in SQL, plus the total that matches.
// Backed by admin_content_list(). The total rides on every row, so an empty page carries no total:
// the caller asks again for page one when it needs to know how many pages exist.
export async function fetchContentList(
  filters: ContentFilters,
): Promise<{ rows: ContentRow[]; total: number }> {
  const db = await getAdminClient();
  const { data, error } = await db.rpc('admin_content_list', {
    p_kind: filters.kind,
    // The SQL function matches with ILIKE, so LIKE wildcards in what was typed are escaped here.
    p_q: filters.q ? escapeLike(filters.q) : null,
    p_category: filters.category === 'all' ? null : filters.category,
    p_status: filters.status,
    p_reported: filters.reportedOnly,
    p_limit: PAGE_SIZE,
    p_offset: (filters.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(`Loading content failed: ${error.message}`);

  const rows = (data ?? []) as ContentListRow[];
  return {
    rows: rows.map((row) => ({
      type: row.item_type,
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorId: row.author_id,
      authorName: row.author_name ?? 'Anon',
      reportCount: row.report_count,
      hidden: row.hidden,
      postId: row.post_id,
      category: row.category ?? undefined,
      pinnedAt: row.pinned_at,
      upvotes: row.upvotes ?? undefined,
    })),
    total: rows.length ? Number(rows[0].total_count) : 0,
  };
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

// Everything the dashboard's cards and chart need, in one round trip (see admin_dashboard() in
// supabase/admin.sql). Computed in SQL because the Supabase API caps responses at 1000 rows, which
// would make counting in JS undercount. Every figure is a count of real rows.
export async function fetchDashboard(): Promise<AdminDashboard> {
  const db = await getAdminClient();
  const { data, error } = await db.rpc('admin_dashboard');
  if (error || !data) throw new Error(`Loading the dashboard failed: ${error?.message ?? 'no data'}`);
  return data as AdminDashboard;
}

interface ReportListRow {
  item_type: 'post' | 'advice';
  id: string;
  post_id: string;
  body: string;
  category: Category | null;
  author_id: string;
  author_name: string | null;
  report_count: number;
  latest_report_at: string;
  created_at: string;
  total_count: number | string;
}

// Open reports, most-reported first (ties: the most recent report first), with the time of each
// item's latest report and the full count. Backed by admin_reports_list().
export async function fetchReportsList({
  type,
  q,
  limit = 25,
  offset = 0,
}: {
  type?: 'post' | 'advice';
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: ReportRow[]; total: number }> {
  const db = await getAdminClient();
  const { data, error } = await db.rpc('admin_reports_list', {
    p_type: type ?? null,
    p_q: q?.trim() ? escapeLike(q.trim()) : null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(`Loading reports failed: ${error.message}`);

  const rows = (data ?? []) as ReportListRow[];
  return {
    items: rows.map((row) => ({
      type: row.item_type,
      id: row.id,
      postId: row.post_id,
      body: row.body,
      category: row.category,
      authorId: row.author_id,
      authorName: row.author_name ?? 'Anon',
      reportCount: row.report_count,
      latestReportAt: row.latest_report_at,
      createdAt: row.created_at,
    })),
    total: rows.length ? Number(rows[0].total_count) : 0,
  };
}

export async function fetchStats(days: number = 30): Promise<AdminStats> {
  const db = await getAdminClient();
  const { data, error } = await db.rpc('admin_stats', { p_days: days });
  if (error) throw new Error(`Loading stats failed: ${error.message}`);
  return data as AdminStats;
}

// For the settings page: the banner (four settings rows), the blocked words, and how long the
// database took to answer on this load (the "database connection" figure).
export async function fetchSettings(): Promise<{ banner: Banner; blockedWords: string[]; dbMs: number }> {
  const db = await getAdminClient();
  const started = performance.now();
  const [settings, words] = await Promise.all([
    db.from('settings').select('key, value').in('key', [...ANNOUNCEMENT_KEYS]),
    db.from('blocked_words').select('word').order('word', { ascending: true }),
  ]);
  const dbMs = Math.round(performance.now() - started);

  if (settings.error) throw new Error(`Loading the announcement failed: ${settings.error.message}`);
  if (words.error) throw new Error(`Loading blocked words failed: ${words.error.message}`);

  return {
    banner: parseBanner((settings.data ?? []) as { key: string; value: string }[]),
    blockedWords: (words.data ?? []).map((row) => String(row.word)),
    dbMs,
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
