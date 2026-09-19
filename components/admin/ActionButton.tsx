'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/cn';
import type { ActionResult } from '@/lib/admin/types';

export function ActionButton({
  action,
  label,
  confirmLabel,
  tone = 'default',
  onDone,
}: {
  /** A Server Action with its arguments already bound, e.g. deleteContent.bind(null, 'post', id). */
  action: () => Promise<ActionResult>;
  label: string;
  /** When set, the first click only arms the button; a second click on this label runs it. */
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  /** Called after the action succeeded (for example to close a detail panel). */
  onDone?: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else onDone?.();
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
        ? 'border-red-600 bg-red-600 text-white'
        : 'border-red-200 bg-page text-red-600 hover:bg-red-50'
      : 'border-border bg-page text-ink hover:bg-sunken';

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className={cn('h-8 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-50', style)}
        >
          {pending ? 'Working…' : armed ? confirmLabel : label}
        </button>
        {armed && !pending && (
          <button type="button" onClick={() => setArmed(false)} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        )}
      </span>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
