'use client';

import { useState, useTransition } from 'react';
import { banAuthor } from '@/app/admin/actions/moderation';

// Bans an author's device. `defaultOpen` shows the confirmation straight away (used when a menu
// launches it); `onClose` is told when it is cancelled or done.
export function BanButton({
  anonUserId,
  authorName,
  defaultOpen = false,
  onClose,
}: {
  anonUserId: string;
  authorName: string;
  defaultOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hideContent, setHideContent] = useState(true); // hide is reversible, so default on
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    onClose?.();
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await banAuthor(anonUserId, hideContent, reason);
      if (!result.ok) setError(result.error);
      else close();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 rounded-lg border border-red-200 bg-page px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        Ban author
      </button>
    );
  }

  return (
    <div className="mt-2 w-full max-w-lg rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm">
      <p className="text-ink">
        Ban <strong>{authorName}</strong>&apos;s device from posting and replying?
      </p>
      <p className="mt-1 text-xs text-muted">
        Bans follow the browser&apos;s stored identity; clearing site data gets a fresh one.
      </p>
      <label className="mt-3 flex items-center gap-2 text-body">
        <input
          type="checkbox"
          checked={hideContent}
          onChange={(e) => setHideContent(e.target.checked)}
          className="size-4 accent-primary"
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
        className="mt-3 h-10 w-full rounded-lg border border-border-strong bg-page px-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Banning…' : 'Confirm ban'}
        </button>
        <button type="button" onClick={close} disabled={pending} className="text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
