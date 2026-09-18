// Shared admin types. Pure (no server-only) so client components can import them too.
import type { Category } from '../types';
import type { TargetType } from './validate';

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ContentKind = 'posts' | 'advices';
export type ContentStatus = 'all' | 'visible' | 'hidden';

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

export interface ReportItem {
  type: TargetType;
  id: string;
  body: string;
  reportCount: number;
  createdAt: string;
  authorId: string;
  authorName: string;
  /** Posts only. */
  category?: Category;
  /** The thread this item belongs to: the post's own id, or an advice's parent post. */
  postId: string;
}
