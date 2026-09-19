// Shared admin types. Pure (no server-only) so client components can import them too.
import type { Category } from '../types';
import type { TargetType } from './validate';

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ContentKind = 'all' | 'posts' | 'advices';
export type ContentStatus = 'all' | 'visible' | 'hidden' | 'flagged';

export interface ContentFilters {
  kind: ContentKind;
  q: string;
  category: Category | 'all';
  status: ContentStatus;
  reportedOnly: boolean;
  page: number;
}

export interface ContentRow {
  type: TargetType;
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  reportCount: number;
  hidden: boolean;
  postId: string;
  /** Posts only. */
  category?: Category;
  /** Posts only; set when pinned. */
  pinnedAt?: string | null;
  /** Advice only. */
  upvotes?: number;
}

export interface BanRow {
  deviceToken: string;
  reason: string | null;
  bannedAt: string;
  /** Null if the anon_users row for the token no longer exists. */
  authorId: string | null;
  authorName: string | null;
  postCount: number;
  adviceCount: number;
}

export interface DailyPoint {
  /** Calendar day, "YYYY-MM-DD" (UTC). */
  day: string;
  posts: number;
  advices: number;
  new_users: number;
}

/** The JSON document returned by the admin_stats() SQL function. */
export interface AdminStats {
  totals: {
    posts: number;
    advices: number;
    anon_users: number;
    hidden_posts: number;
    hidden_advices: number;
    banned_devices: number;
    open_reports: number;
  };
  by_category: { category: Category; count: number }[];
  daily: DailyPoint[];
}

/** The JSON document returned by the admin_dashboard() SQL function. */
export interface AdminDashboard {
  totals: {
    posts: number;
    advices: number;
    anon_users: number;
    open_reports: number;
    /** Open items with 3 or more reports. */
    urgent_reports: number;
    hidden_items: number;
    banned_devices: number;
    new_content_24h: number;
    new_reports_24h: number;
    failed_signins_24h: number;
  };
  /** [the last 7 days, the 7 days before]. */
  week: {
    posts: [number, number];
    advices: [number, number];
    anon_users: [number, number];
    reports: [number, number];
  };
  /** The last 7 calendar days (UTC), oldest first. */
  daily: { day: string; content: number; users: number; reports: number }[];
}

/** One row of admin_reports_list(): an open (reported, not hidden) post or reply. */
export interface ReportRow {
  type: TargetType;
  id: string;
  postId: string;
  body: string;
  /** Posts only. */
  category: Category | null;
  authorId: string;
  authorName: string;
  reportCount: number;
  latestReportAt: string;
  createdAt: string;
}

/** State returned by the settings forms (used with useActionState). */
export interface SettingsFormState {
  ok?: boolean;
  message?: string;
  error?: string;
}
