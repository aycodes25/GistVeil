import { Clock, MessageSquare, Pin } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { FeedPost } from '@/lib/feed';
import { ShareButton } from './ShareButton';

// A feed card. The whole card opens the post (the title's link is stretched over it); the share
// button sits above that link so it stays clickable on its own.
export function PostCard({ post }: { post: FeedPost }) {
  const href = `/post/${post.id}`;
  return (
    <Card className="group relative flex flex-col px-[22px] pt-[23px] pb-6 transition-shadow hover:shadow-[0_6px_18px_rgb(20_20_40/0.1)]">
      <div className="flex items-center gap-3">
        <Avatar name={post.authorName} size={40} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Badge tone="primary" size="xs" className="uppercase">
              {post.categoryLabel}
            </Badge>
            {post.pinned && (
              <span className="inline-flex items-center gap-1.5 text-[10px] leading-4 font-semibold tracking-[0.05em] text-primary uppercase">
                <Pin aria-hidden className="size-[11px]" />
                Pinned
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
            <Clock aria-hidden className="size-3" />
            {post.timeLabel}
          </p>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="mt-3 line-clamp-3 font-heading text-2xl leading-snug font-semibold text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-card after:content-['']">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mt-4 line-clamp-3 text-base leading-relaxed text-muted">{post.excerpt}</p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border-soft pt-3">
        <span
          className="inline-flex items-center gap-1.5 text-sm text-muted"
          aria-label={`${post.replies} ${post.replies === 1 ? 'reply' : 'replies'}`}
        >
          <MessageSquare aria-hidden className="size-4" />
          {post.replies}
        </span>
        <div className="flex items-center gap-1.5">
          <ShareButton path={href} title={post.title} />
          <span className="px-3.5 py-1.5 text-xs font-semibold text-primary group-hover:underline">Read More</span>
        </div>
      </div>
    </Card>
  );
}
