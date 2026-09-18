'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateAnonIdentity } from '@/lib/anonIdentity';
import { checkSafety } from '@/lib/safetyFilter';
import { fetchBlockedWords } from '@/lib/blockedWords';

export function AddAdviceForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError('Write something before posting.');
      return;
    }

    // Submitting is set before the first await so a double-click can't submit twice while
    // the blocked-words list loads.
    setSubmitting(true);
    try {
      const safety = checkSafety(body, await fetchBlockedWords());
      if (!safety.ok) {
        setError(safety.reason ?? 'This reply cannot be published.');
        return;
      }

      const identity = await getOrCreateAnonIdentity();
      const { error: insertError } = await supabase.from('advices').insert({
        post_id: postId,
        anon_user_id: identity.id,
        body: body.trim(),
      });

      if (insertError) throw insertError;

      setBody('');
      router.refresh();
    } catch {
      setError("Couldn't post right now. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add your advice…"
        rows={3}
        className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-neutral-100"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Posting…' : 'Add advice anonymously'}
      </button>
    </form>
  );
}
