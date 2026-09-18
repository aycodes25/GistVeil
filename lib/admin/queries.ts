import 'server-only';
import { getAdminClient } from './client';
import type { ReportItem } from './types';
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
