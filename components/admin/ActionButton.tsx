'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/admin/types';

export function ActionButton({
  action,
  label,
  confirmLabel,
  tone = 'default',
}: {
  /** A Server Action with its arguments already bound, e.g. deleteContent.bind(null, 'post', id). */
  action: () => Promise<ActionResult>;
  label: string;
  /** When set, the first click only arms the button; a second click on this label runs it. */
  confirmLabel?: string;
  tone?: 'default' | 'danger';
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      setArmed(false);
    });
  }

  function handleClick() {
    if (confirmLabel && !armed) {
      setArmed(true);
      return;
    }
    run();
  }

  const style =
    tone === 'danger'
      ? armed
        ? 'bg-red-600 text-white'
        : 'border border-red-900 text-red-400 hover:border-red-600'
      : 'border border-neutral-700 text-neutral-200 hover:border-purple-600';

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className={`rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${style}`}
        >
          {pending ? 'Working…' : armed ? confirmLabel : label}
        </button>
        {armed && !pending && (
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="text-sm text-neutral-400 hover:text-white"
          >
            Cancel
          </button>
        )}
      </span>
      {error && (
        <span role="alert" className="text-xs text-red-400">
          {error}
        </span>
      )}
    </span>
  );
}
