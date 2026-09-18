// Shared admin types. Pure (no server-only) so client components can import them too.
import type { Category } from '../types';
import type { TargetType } from './validate';

export type ActionResult = { ok: true } | { ok: false; error: string };

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
