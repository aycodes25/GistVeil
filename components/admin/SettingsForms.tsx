'use client';

import { Eye, Save, X } from 'lucide-react';
import { useActionState, useState, useTransition } from 'react';
import { addBlockedWords, removeBlockedWord, saveBanner } from '@/app/admin/actions/settings';
import { AnnouncementBanner } from '@/components/site/AnnouncementBanner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { BANNER_THEMES, BANNER_THEME_LABELS, isBannerTheme, type Banner } from '@/lib/announcement';
import type { SettingsFormState } from '@/lib/admin/types';
import { ANNOUNCEMENT_MAX, BANNER_TITLE_MAX } from '@/lib/admin/validate';

const idle: SettingsFormState = {};

const fieldClass =
  'w-full rounded-xl border border-border-strong bg-page px-3.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';
const labelClass = 'block text-sm font-medium text-ink';

function Feedback({ state }: { state: SettingsFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm font-medium text-red-600">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm font-medium text-emerald-700">
        {state.message}
      </p>
    );
  }
  return null;
}

// The banner editor. Every field is controlled: React 19 resets an uncontrolled field after each
// action, and remounting the form would throw away the confirmation message along with the form
// state. The preview reads the same state, so it is always what would be saved. An empty message
// removes the banner.
export function BannerForm({ current }: { current: Banner }) {
  const [state, formAction, pending] = useActionState(saveBanner, idle);
  const [title, setTitle] = useState(current.title);
  const [message, setMessage] = useState(current.message);
  const [theme, setTheme] = useState(current.theme);
  const [active, setActive] = useState(current.active);

  const changed =
    title !== current.title || message !== current.message || theme !== current.theme || active !== current.active;

  return (
    <form action={formAction}>
      <div className="flex items-start justify-between gap-4 p-6">
        <div>
          <h3 className="font-heading text-xl font-semibold text-ink">Banner Configuration</h3>
          <p className="mt-0.5 text-sm text-muted">Visual state and content of the top-level announcement.</p>
        </div>
        <div className="flex items-center gap-3 text-sm font-medium text-ink">
          <span aria-hidden>Active State</span>
          <Toggle checked={active} onChange={setActive} label="Show the banner to visitors" name="active" />
        </div>
      </div>

      <div className="grid gap-6 px-6 pb-6 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label htmlFor="title" className={labelClass}>
              Banner Title
            </label>
            <input
              id="title"
              name="title"
              value={title}
              maxLength={BANNER_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Community Guidelines Update"
              className={`${fieldClass} mt-1.5 h-11`}
            />
          </div>
          <div>
            <label htmlFor="message" className={labelClass}>
              Banner Message
            </label>
            <textarea
              id="message"
              name="message"
              value={message}
              maxLength={ANNOUNCEMENT_MAX}
              rows={5}
              onChange={(event) => setMessage(event.target.value)}
              className={`${fieldClass} mt-1.5 py-3 leading-6`}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-muted">
              <span>Leave empty and save to remove the banner.</span>
              <span>
                {message.length}/{ANNOUNCEMENT_MAX}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="theme" className={labelClass}>
              Banner Theme
            </label>
            <Select
              id="theme"
              name="theme"
              value={theme}
              onChange={(event) => isBannerTheme(event.target.value) && setTheme(event.target.value)}
              className="mt-1.5 w-full"
            >
              {BANNER_THEMES.map((value) => (
                <option key={value} value={value}>
                  {BANNER_THEME_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className={`${labelClass} flex items-center gap-2`}>
              <Eye aria-hidden className="size-4 text-muted" />
              Preview (Live Mockup)
            </p>
            <div className="mt-1.5">
              {message.trim() ? (
                <AnnouncementBanner title={title.trim()} message={message.trim()} theme={theme} clamp />
              ) : (
                <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-sm text-muted">
                  Your banner will appear here once it has a message.
                </p>
              )}
            </div>
            {!active && message.trim() && (
              <p className="mt-2 text-xs text-muted">Switched off: visitors won&apos;t see this until Active State is on.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft bg-sunken/50 px-6 py-4">
        <div className="min-h-5">
          <Feedback state={state} />
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={!changed || pending}
            onClick={() => {
              setTitle(current.title);
              setMessage(current.message);
              setTheme(current.theme);
              setActive(current.active);
            }}
          >
            Reset Changes
          </Button>
          <Button type="submit" disabled={pending}>
            <Save aria-hidden className="size-4" />
            {pending ? 'Saving…' : 'Save Banner'}
          </Button>
        </div>
      </div>
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
      <label htmlFor="words" className={labelClass}>
        Add words or phrases
      </label>
      <textarea
        id="words"
        name="words"
        rows={3}
        value={words}
        onChange={(event) => setWords(event.target.value)}
        placeholder="One per line, or separated by commas"
        className={`${fieldClass} py-3 leading-6`}
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending || words.trim() === ''} className="self-start">
        {pending ? 'Adding…' : 'Add to blocklist'}
      </Button>
    </form>
  );
}

function WordChip({ word }: { word: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="inline-flex items-center gap-1 rounded-full border border-border bg-page py-1 pr-1 pl-3 text-sm text-ink">
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
        className="grid size-6 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-50"
      >
        <X aria-hidden className="size-3.5" />
      </button>
      {error && (
        <span role="alert" className="pr-2 text-xs text-red-600">
          {error}
        </span>
      )}
    </li>
  );
}

export function BlockedWordList({ words }: { words: string[] }) {
  if (words.length === 0) {
    return <p className="text-sm text-muted">No extra words yet. The built-in list still applies.</p>;
  }
  return (
    <ul aria-label="Blocked words" className="flex flex-wrap gap-2">
      {words.map((word) => (
        <WordChip key={word} word={word} />
      ))}
    </ul>
  );
}
