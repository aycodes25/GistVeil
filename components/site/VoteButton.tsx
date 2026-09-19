'use client';

import { ArrowBigUp } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { getOrCreateAnonIdentity } from '@/lib/anonIdentity';
import { cn } from '@/lib/cn';
import { hasVoted, markVoted, subscribeLocalActions } from '@/lib/localActions';
import { supabase } from '@/lib/supabaseClient';

// The upvote pill on a reply. One vote per browser: once voted (now, or on an earlier visit) the
// pill is filled and disabled. The server has its own limit per device token behind increment_upvote.
export function VoteButton({ adviceId, initialUpvotes }: { adviceId: string; initialUpvotes: number }) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [busy, setBusy] = useState(false);
  const voted = useSyncExternalStore(subscribeLocalActions, () => hasVoted(adviceId), () => false);

  async function handleClick() {
    if (voted || busy) return;
    setBusy(true);
    try {
      const identity = await getOrCreateAnonIdentity();
      const { error } = await supabase.rpc('increment_upvote', {
        p_advice_id: adviceId,
        p_device_token: identity.device_token,
      });
      if (!error) {
        setUpvotes((n) => n + 1);
        markVoted(adviceId);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={voted || busy}
      aria-pressed={voted}
      aria-label={voted ? `You upvoted this advice: ${upvotes} upvotes` : `Upvote this advice: ${upvotes} upvotes so far`}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors disabled:cursor-default',
        voted
          ? 'border-primary/30 bg-chip text-primary'
          : 'border-border bg-sunken text-ink hover:border-primary/40 hover:text-primary',
      )}
    >
      <ArrowBigUp aria-hidden className={cn('size-4', voted && 'fill-current')} />
      {upvotes}
    </button>
  );
}
