import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { categoryLabel } from '@/lib/categories';
import { timeAgo } from '@/lib/time';
import { AdviceItem } from '@/components/AdviceItem';
import { AddAdviceForm } from '@/components/AddAdviceForm';
import { ReportButton } from '@/components/ReportButton';
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

  const { data: advicesData } = await supabase
    .from('advices')
    .select('*, anon_users(anon_name)')
    .eq('post_id', id)
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false });

  const advices = (advicesData ?? []) as unknown as Advice[];

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <a href="/" className="text-sm text-neutral-400">← Back</a>
      <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
          <span>{post.anon_users?.anon_name ?? 'Anon'}</span>
          <span>·</span>
          <span>{timeAgo(post.created_at)}</span>
          <span className="ml-auto rounded bg-neutral-800 px-2 py-0.5">
            {categoryLabel(post.category)}
          </span>
        </div>
        <p className="text-neutral-100">{post.body}</p>
        <div className="mt-2">
          <ReportButton targetType="post" targetId={post.id} />
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-lg font-semibold text-white">
        Advice ({advices.length})
      </h2>
      <div>
        {advices.map((advice) => (
          <AdviceItem key={advice.id} advice={advice} />
        ))}
      </div>

      <AddAdviceForm postId={post.id} />
    </main>
  );
}
