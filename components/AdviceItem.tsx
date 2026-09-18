import { timeAgo } from '@/lib/time';
import { UpvoteButton } from './UpvoteButton';
import { ReportButton } from './ReportButton';
import type { Advice } from '@/lib/types';

export function AdviceItem({ advice }: { advice: Advice }) {
  return (
    <div className="border-t border-neutral-800 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-neutral-400">
        <span>{advice.anon_users?.anon_name ?? 'Anon'}</span>
        <span>·</span>
        <span>{timeAgo(advice.created_at)}</span>
      </div>
      <p className="text-neutral-100">{advice.body}</p>
      <div className="mt-2 flex items-center gap-4">
        <UpvoteButton adviceId={advice.id} initialUpvotes={advice.upvotes} />
        <ReportButton targetType="advice" targetId={advice.id} />
      </div>
    </div>
  );
}
