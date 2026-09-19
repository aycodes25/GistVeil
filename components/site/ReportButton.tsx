'use client';

import { Flag } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { getOrCreateAnonIdentity } from '@/lib/anonIdentity';
import { cn } from '@/lib/cn';
import { hasReported, markReported, subscribeLocalActions } from '@/lib/localActions';
import { supabase } from '@/lib/supabaseClient';

// Reports a post or a reply to the moderators. Once per browser: after reporting (now, or on an
// earlier visit) it reads "Reported" and is disabled. "button" is the post's header action; "link"
// is the quiet one under each reply.
export function ReportButton({
  targetType,
  targetId,
  variant = 'link',
}: {
  targetType: 'post' | 'advice';
  targetId: string;
  variant?: 'button' | 'link';
}) {
  const [busy, setBusy] = useState(false);
  const reported = useSyncExternalStore(subscribeLocalActions, () => hasReported(targetId), () => false);

  async function handleClick() {
    if (reported || busy) return;
    setBusy(true);
    try {
      const identity = await getOrCreateAnonIdentity();
      const { error } = await supabase.rpc('increment_report', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_device_token: identity.device_token,
      });
      if (!error) markReported(targetId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={reported || busy}
      className={cn(
        'transition-colors disabled:cursor-default',
        variant === 'button'
          ? 'inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-page px-4 text-[13px] font-medium enabled:text-red-500 enabled:hover:bg-red-50 disabled:text-muted'
          : 'inline-flex items-center gap-1.5 text-xs text-muted enabled:hover:text-red-500',
      )}
    >
      <Flag aria-hidden className={variant === 'button' ? 'size-4' : 'size-3'} />
      {reported ? 'Reported' : 'Report'}
    </button>
  );
}
