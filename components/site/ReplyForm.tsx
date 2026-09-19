'use client';

import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getOrCreateAnonIdentity } from '@/lib/anonIdentity';
import { fetchBlockedWords } from '@/lib/blockedWords';
import { readAnonName, subscribeIdentity } from '@/lib/identityStore';
import { checkSafety } from '@/lib/safetyFilter';
import { supabase } from '@/lib/supabaseClient';

// "Share Your Wisdom": the reply box. What it checks, says and does is what the page did before the
// redesign: an empty reply is refused, the safety filter (built-in words plus the admin's list)
// has the last word, and a posted reply clears the box and refreshes the thread.
export function ReplyForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // The visitor's own name once they have one (created on their first post, vote or report).
  const anonName = useSyncExternalStore(subscribeIdentity, readAnonName, () => null);

  async function handleSubmit(e: FormEvent) {
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
    <form onSubmit={handleSubmit} noValidate>
      <Card className="p-6">
        <div className="flex gap-4">
          <Avatar name={anonName ?? 'Anonymous'} size={32} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <label htmlFor="advice" className="sr-only">
              Your advice
            </label>
            <textarea
              id="advice"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your thoughtful advice here..."
              className="block min-h-[120px] w-full resize-y bg-transparent text-sm leading-6 text-ink placeholder:text-ink-2 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-border-soft pt-4">
          <p className="text-[11px] text-muted">
            {anonName ? (
              <>
                Posting as <span className="font-medium text-ink">{anonName}</span>
              </>
            ) : (
              'Posting anonymously'
            )}{' '}
            • Character count: {body.length.toLocaleString('en-US')}
          </p>
          <Button type="submit" disabled={submitting} className="min-w-40">
            <Send aria-hidden className="size-4" />
            {submitting ? 'Posting…' : 'Post Advice'}
          </Button>
        </div>
      </Card>
    </form>
  );
}
