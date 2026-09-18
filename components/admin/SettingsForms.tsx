'use client';

import { useActionState, useState, useTransition } from 'react';
import { addBlockedWords, removeBlockedWord, saveAnnouncement } from '@/app/admin/actions/settings';
import type { SettingsFormState } from '@/lib/admin/types';
import { ANNOUNCEMENT_MAX } from '@/lib/admin/validate';

const idle: SettingsFormState = {};

const fieldClass =
  'rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100';
const buttonClass =
  'self-start rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50';

function Feedback({ state }: { state: SettingsFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-400">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm text-emerald-400">
        {state.message}
      </p>
    );
  }
  return null;
}

// The textarea is controlled: React 19 resets an uncontrolled field after every action, and
// remounting the form (say, by keying it on the saved value) would throw away the
// confirmation message along with the form state. The counter is derived from the text, so
// it can never go stale.
export function AnnouncementForm({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState(saveAnnouncement, idle);
  const [text, setText] = useState(current);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="announcement" className="text-sm text-neutral-300">
        Banner text
      </label>
      <textarea
        id="announcement"
        name="announcement"
        value={text}
        maxLength={ANNOUNCEMENT_MAX}
        rows={3}
        onChange={(event) => setText(event.target.value)}
        className={fieldClass}
      />
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>Leave empty and save to remove the banner.</span>
        <span>
          {text.length}/{ANNOUNCEMENT_MAX}
        </span>
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Saving…' : 'Save announcement'}
      </button>
    </form>
  );
}

export function BlockedWordsForm() {
  // Controlled on purpose: React 19 resets an uncontrolled field after every action, which
  // would wipe what was typed when validation fails. It is cleared only on success.
  const [words, setWords] = useState('');
  const [state, formAction, pending] = useActionState(
    async (previous: SettingsFormState, formData: FormData) => {
      const result = await addBlockedWords(previous, formData);
      if (result.ok) setWords('');
      return result;
    },
    idle,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="words" className="text-sm text-neutral-300">
        Add words or phrases
      </label>
      <textarea
        id="words"
        name="words"
        rows={2}
        value={words}
        onChange={(event) => setWords(event.target.value)}
        placeholder="One per line, or separated by commas"
        className={fieldClass}
      />
      <Feedback state={state} />
      <button type="submit" disabled={pending || words.trim() === ''} className={buttonClass}>
        {pending ? 'Adding…' : 'Add to blocklist'}
      </button>
    </form>
  );
}

function WordChip({ word }: { word: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-950 py-1 pr-1 pl-3 text-sm text-neutral-200">
      <span className="break-all">{word}</span>
      <button
        type="button"
        aria-label={`Remove ${word}`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await removeBlockedWord(word);
            if (!result.ok) setError(result.error);
          })
        }
        className="rounded-full px-2 text-neutral-400 hover:text-white disabled:opacity-50"
      >
        ×
      </button>
      {error && (
        <span role="alert" className="pr-2 text-xs text-red-400">
          {error}
        </span>
      )}
    </li>
  );
}

export function BlockedWordList({ words }: { words: string[] }) {
  if (words.length === 0) {
    return <p className="text-sm text-neutral-500">No extra words yet. The built-in list still applies.</p>;
  }
  return (
    <ul aria-label="Blocked words" className="flex flex-wrap gap-2">
      {words.map((word) => (
        <WordChip key={word} word={word} />
      ))}
    </ul>
  );
}
