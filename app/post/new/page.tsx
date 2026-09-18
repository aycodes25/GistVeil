'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateAnonIdentity } from '@/lib/anonIdentity';
import { checkSafety } from '@/lib/safetyFilter';
import { CATEGORIES } from '@/lib/categories';
import type { Category } from '@/lib/types';

export default function NewPostPage() {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

    const safety = checkSafety(body);
    if (!safety.ok) {
      setError(safety.reason ?? 'This post cannot be published.');
      return;
    }

    setSubmitting(true);
    try {
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

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-white">Create Post</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's on your mind? Be anonymous..."
          rows={6}
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-neutral-100"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-neutral-100"
        >
          <option value="">Pick a category</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {error && <p className="text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-purple-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Posting…' : 'Post Anonymously'}
        </button>
      </form>
    </main>
  );
}
