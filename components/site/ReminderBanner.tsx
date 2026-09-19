'use client';

import { CircleAlert } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { dismissReminder, isReminderDismissed, subscribeLocalActions } from '@/lib/localActions';

// "Gentle Reminder": shown until the visitor says "Got it, thanks", then remembered in this browser.
// It is left out of the server's HTML and appears once the page is live, so a visitor who already
// dismissed it never sees it flash up. `closed` covers a browser that cannot store the choice: the
// banner still goes away for this visit.
export function ReminderBanner() {
  const [closed, setClosed] = useState(false);
  const dismissed = useSyncExternalStore(subscribeLocalActions, isReminderDismissed, () => true);
  if (dismissed || closed) return null;

  return (
    <div role="note" className="mt-8 flex gap-3 rounded-xl border border-wash-edge bg-wash px-4 py-[13px]">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
      <div className="min-w-0">
        <p className="text-[13px] leading-5 font-medium text-ink">Gentle Reminder</p>
        <p className="text-sm leading-5 text-ink">
          You are sharing advice in a safe space. Please keep your replies empathetic, constructive, and avoid
          judgmental language. Let&apos;s maintain the serene atmosphere of GistVeil.
        </p>
        <button
          type="button"
          onClick={() => {
            dismissReminder();
            setClosed(true);
          }}
          className="mt-2.5 rounded text-xs font-medium text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Got it, thanks.
        </button>
      </div>
    </div>
  );
}
