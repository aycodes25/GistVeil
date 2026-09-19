import { Avatar } from '@/components/ui/Avatar';
import { timeAgoLong } from '@/lib/time';
import type { Advice } from '@/lib/types';
import { ReportButton } from './ReportButton';
import { VoteButton } from './VoteButton';

// One reply in the thread. `isOp` is true when the reply's author is the post's author (a real
// comparison of the two anonymous users, not a label anyone can claim). The line under the avatar
// is the thread rail, as in the mockup.
export function ReplyItem({ advice, isOp }: { advice: Advice; isOp: boolean }) {
  const name = advice.anon_users?.anon_name ?? 'Anon';
  return (
    <li className="flex gap-4">
      <div className="flex shrink-0 flex-col items-center">
        <Avatar name={name} size={36} />
        <span aria-hidden className="mt-2 w-0.5 flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-[39px]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 leading-6">
          <span className="text-sm font-medium text-ink-2">{name}</span>
          {isOp && (
            <span className="rounded-full bg-chip px-2 text-[10px] leading-4 font-semibold text-primary">OP</span>
          )}
          <span className="text-[11px] text-muted">• {timeAgoLong(advice.created_at)}</span>
        </div>
        <p className="mt-0.5 text-sm leading-[23px] whitespace-pre-line text-body [overflow-wrap:anywhere]">
          {advice.body}
        </p>
        <div className="mt-3 flex items-center gap-4">
          <VoteButton adviceId={advice.id} initialUpvotes={advice.upvotes} />
          <ReportButton targetType="advice" targetId={advice.id} />
        </div>
      </div>
    </li>
  );
}
