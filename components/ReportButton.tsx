'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateAnonIdentity } from '@/lib/anonIdentity';
import { hasReported, markReported } from '@/lib/localActions';

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: 'post' | 'advice';
  targetId: string;
}) {
  const [reported, setReported] = useState(() => hasReported(targetId));
  const [busy, setBusy] = useState(false);

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
      if (!error) {
        markReported(targetId);
        setReported(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={reported || busy}
      className="text-xs text-neutral-500 hover:text-red-400"
    >
      {reported ? 'Reported' : 'Report'}
    </button>
  );
}
