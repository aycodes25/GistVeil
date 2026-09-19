import { ArrowLeft, Clock, MessageSquare, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicShell } from '@/components/shell/PublicShell';
import { ReminderBanner } from '@/components/site/ReminderBanner';
import { ReplyForm } from '@/components/site/ReplyForm';
import { ReplyItem } from '@/components/site/ReplyItem';
import { ReportButton } from '@/components/site/ReportButton';
import { ShareButton } from '@/components/site/ShareButton';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { categoryLabel } from '@/lib/categories';
import { feedHref } from '@/lib/feed';
import { splitPostText } from '@/lib/present';
import { supabase } from '@/lib/supabaseClient';
import { timeAgoLong } from '@/lib/time';
import type { Advice, Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: postData, error: postError } = await supabase
    .from('posts')
    .select('*, anon_users(anon_name)')
    .eq('id', id)
    .single();

  if (postError || !postData) {
    notFound();
  }

  const post = postData as unknown as Post;

  // Most helpful first: upvotes, then newest.
  const { data: advicesData } = await supabase
    .from('advices')
    .select('*, anon_users(anon_name)')
    .eq('post_id', id)
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false });

  const advices = (advicesData ?? []) as unknown as Advice[];

  // The first sentence is the heading and the rest is the body, so title + body is the whole text.
  const { title, excerpt } = splitPostText(post.body);
  const author = post.anon_users?.anon_name ?? 'Anon';
  const category = categoryLabel(post.category);

  return (
    <PublicShell
      crumbs={[
        { label: 'Home Feed', href: '/' },
        { label: category, href: feedHref({ category: post.category }) },
        { label: 'Post Detail' },
      ]}
      title="Viewing Advice Request"
    >
      <div className="mx-auto w-full max-w-[1000px] px-4 pt-[30px] pb-16 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" />
            Back to community feed
          </Link>
          <div className="flex items-center gap-2.5">
            <ShareButton path={`/post/${post.id}`} title={title} variant="button" />
            <ReportButton targetType="post" targetId={post.id} variant="button" />
          </div>
        </div>

        <Card outline={false} className="mt-8 px-5 pt-8 pb-[43px] sm:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex h-[22px] items-center rounded-full bg-chip px-3 text-xs font-medium text-primary">
              {category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <Clock aria-hidden className="size-3" />
              Posted {timeAgoLong(post.created_at)}
            </span>
          </div>

          <h2 className="mt-[18px] font-heading text-[22.5px] leading-8 font-semibold text-ink-2 [overflow-wrap:anywhere]">
            {title}
          </h2>

          {excerpt && (
            <div className="mt-[17px] sm:flex sm:gap-6">
              {/* Beside the text on wider screens; on a phone the text gets the full width. */}
              <div className="hidden shrink-0 sm:block">
                <Avatar name={author} size={48} />
              </div>
              <p className="min-w-0 text-base leading-7 whitespace-pre-line text-body sm:text-[17px] sm:leading-8 [overflow-wrap:anywhere]">
                {excerpt}
              </p>
            </div>
          )}

          <div className="mt-6 border-t-2 border-border-soft pt-4 sm:ml-[72px]">
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <MessageSquare aria-hidden className="size-4" />
              {advices.length} Advice {advices.length === 1 ? 'Thread' : 'Threads'}
            </p>
          </div>
        </Card>

        <ReminderBanner />

        <section aria-labelledby="wisdom-label" className="mt-[31px]">
          <p id="wisdom-label" className="text-[10px] leading-4 font-semibold tracking-[0.1em] text-body uppercase">
            Share Your Wisdom
          </p>
          <div className="mt-5">
            <ReplyForm postId={post.id} />
          </div>
        </section>

        <section aria-labelledby="thread-heading" className="mt-[45px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="thread-heading" className="font-heading text-2xl leading-8 font-semibold text-ink">
              Advice Thread{' '}
              <span className="font-sans text-sm font-normal text-muted">({advices.length})</span>
            </h2>
            <p className="text-xs text-muted">
              Sort by: <span className="ml-1 font-medium text-body">Most Helpful</span>
            </p>
          </div>

          {advices.length === 0 ? (
            <Card className="mt-6 px-6 py-12 text-center text-sm text-muted">
              No advice yet. Be the first to share yours.
            </Card>
          ) : (
            <>
              <ul className="mt-[42px] ml-0 sm:mr-4 sm:ml-4">
                {advices.map((advice) => (
                  <ReplyItem key={advice.id} advice={advice} isOp={advice.anon_user_id === post.anon_user_id} />
                ))}
              </ul>

              <div className="mt-12 flex flex-col items-center text-center">
                <span className="grid size-10 place-items-center rounded-full bg-pill text-muted">
                  <ShieldCheck aria-hidden className="size-[18px]" />
                </span>
                <p className="mt-4 text-sm font-medium text-muted">End of Thread</p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-muted">
                  Every piece of advice helps strengthen our community&apos;s veil of support.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
