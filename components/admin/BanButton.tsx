'use client';

import { useState, useTransition } from 'react';
import { banAuthor } from '@/app/admin/actions/moderation';

export function BanButton({
  anonUserId,
  authorName,
}: {
  anonUserId: string;
  authorName: string;
}) {
  const [open, setOpen] = useState(false);
  const [hideContent, setHideContent] = useState(true); // hide is reversible, so default on
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await banAuthor(anonUserId, hideContent, reason);
      if (!result.ok) setError(result.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-900 px-3 py-1.5 text-sm font-medium text-red-400 hover:border-red-600"
      >
        Ban author
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-lg border border-red-900 bg-neutral-950 p-3 text-sm">
      <p className="text-neutral-200">
        Ban <strong>{authorName}</strong>&apos;s device from posting and replying?
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        Bans follow the browser&apos;s stored identity; clearing site data gets a fresh one.
      </p>
      <label className="mt-3 flex items-center gap-2 text-neutral-300">
        <input
          type="checkbox"
          checked={hideContent}
          onChange={(e) => setHideContent(e.target.checked)}
        />
        Also hide all their content
      </label>
      <input
        type="text"
        value={reason}
        maxLength={200}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        aria-label="Reason for the ban (optional)"
        className="mt-3 w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-100"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="rounded-full bg-red-600 px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Banning…' : 'Confirm ban'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="text-neutral-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
