'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateAnonIdentity } from '@/lib/anonIdentity';
import { hasVoted, markVoted } from '@/lib/localActions';

export function UpvoteButton({
  adviceId,
  initialUpvotes,
}: {
  adviceId: string;
  initialUpvotes: number;
}) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [voted, setVoted] = useState(() => hasVoted(adviceId));
  const [busy, setBusy] = useState(false);

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
        setVoted(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={voted || busy}
      className={`text-sm ${voted ? 'text-purple-400' : 'text-neutral-400 hover:text-purple-400'}`}
    >
      ▲ {upvotes}
    </button>
  );
}
