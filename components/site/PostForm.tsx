'use client';

import { ArrowLeft, Info, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { getOrCreateAnonIdentity } from '@/lib/anonIdentity';
import { fetchBlockedWords } from '@/lib/blockedWords';
import { CATEGORIES } from '@/lib/categories';
import { checkSafety } from '@/lib/safetyFilter';
import { supabase } from '@/lib/supabaseClient';
import type { Category } from '@/lib/types';

const label = 'block text-sm font-medium text-ink';

// The compose form. What it checks, says and does is exactly what the page did before the
// redesign: an empty post or missing category is refused with its own message, the safety filter
// (built-in words plus the admin's list) has the last word, and a successful post goes to its page.
export function PostForm() {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError('Write something before posting.');
      return;
    }
    if (!category) {
      setError('Pick a category.');
      return;
    }

    // Submitting is set before the first await so a double-click can't submit twice while
    // the blocked-words list loads.
    setSubmitting(true);
    try {
      const safety = checkSafety(body, await fetchBlockedWords());
      if (!safety.ok) {
        setError(safety.reason ?? 'This post cannot be published.');
        return;
      }

      const identity = await getOrCreateAnonIdentity();
      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({ anon_user_id: identity.id, category, body: body.trim() })
        .select('id')
        .single();

      if (insertError || !data) {
        throw insertError ?? new Error('Insert failed');
      }

      router.push(`/post/${data.id}`);
    } catch {
      setError("Couldn't post right now. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const count = body.length;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card outline={false} className="mt-[33px] overflow-hidden">
        <div className="px-5 pt-6 pb-8 sm:px-8 sm:pt-8">
          <label htmlFor="category" className={label}>
            Category
          </label>
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="mt-2 w-full sm:w-64"
          >
            <option value="">Pick a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>

          <hr className="my-7 border-border-soft" />

          <label htmlFor="situation" className={label}>
            The Situation
          </label>
          <textarea
            id="situation"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Provide enough context for others to give meaningful advice. What are you feeling? What have you tried so far?"
            aria-describedby="situation-hint"
            className="mt-2 min-h-[280px] w-full resize-y rounded-xl border border-border-strong bg-page p-4 text-sm leading-[22px] text-ink placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          <div id="situation-hint" className="mt-3 flex items-center justify-between gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Info aria-hidden className="size-3.5 shrink-0" />
              Min. 50 characters for better responses.
            </span>
            {/* Counts characters; there is no limit. */}
            <span className="shrink-0 font-mono text-[10px] whitespace-nowrap">
              {count.toLocaleString('en-US')} {count === 1 ? 'character' : 'characters'}
            </span>
          </div>

          {error && (
            <p role="alert" className="mt-5 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t-2 border-border-soft px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Cancel and Discard
          </Link>
          <Button type="submit" size="field" disabled={submitting}>
            <Send aria-hidden className="size-4" />
            {submitting ? 'Posting…' : 'Post Anonymously'}
          </Button>
        </div>
      </Card>
    </form>
  );
}
