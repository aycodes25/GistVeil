import Link from 'next/link';
import { categoryLabel } from '@/lib/categories';
import { timeAgo } from '@/lib/time';
import type { Post } from '@/lib/types';

export function PostCard({ post }: { post: Post }) {
  const preview =
    post.body.length > 140 ? `${post.body.slice(0, 140)}…` : post.body;

  return (
    <Link
      href={`/post/${post.id}`}
      className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-purple-600"
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
        {post.pinned_at && (
          <span className="rounded bg-purple-950 px-2 py-0.5 font-medium text-purple-300">Pinned</span>
        )}
        <span>{post.anon_users?.anon_name ?? 'Anon'}</span>
        <span>·</span>
        <span>{timeAgo(post.created_at)}</span>
        <span className="ml-auto rounded bg-neutral-800 px-2 py-0.5">
          {categoryLabel(post.category)}
        </span>
      </div>
      <p className="text-neutral-100">{preview}</p>
      <div className="mt-2 text-xs text-neutral-400">
        {post.advice_count ?? 0} {post.advice_count === 1 ? 'Reply' : 'Replies'}
      </div>
    </Link>
  );
}
