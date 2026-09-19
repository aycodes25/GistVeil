'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/admin/client';
import type { ActionResult, SettingsFormState } from '@/lib/admin/types';
import { ANNOUNCEMENT_KEYS } from '@/lib/announcement';
import { WORD_MAX, normalizeBanner, parseWordList } from '@/lib/admin/validate';

// Same rules as the moderation actions: authenticate first (getAdminClient), then validate,
// then write; detail goes to the server log and the browser gets a generic message.

const FAILED = "That didn't work. Check the server logs and try again.";
const MAX_WORDS_PER_SUBMIT = 200;

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function failed(context: string, error: unknown): SettingsFormState {
  console.error(`[admin] ${context}: ${describe(error)}`);
  return { error: FAILED };
}

// Saves the whole banner: text, title, colour theme and the on/off switch (four settings rows).
// An empty message removes the banner altogether.
export async function saveBanner(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const db = await getAdminClient();

  const field = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value : null;
  };
  const message = field('message');
  const title = field('title');
  const theme = field('theme');
  const active = field('active');
  if (message === null || title === null || theme === null || active === null) {
    return { error: 'Invalid request.' };
  }

  const result = normalizeBanner({ message, title, theme, active });
  if (!result.ok) return { error: result.error };
  const banner = result.value;

  if (banner.message === '') {
    const { error } = await db.from('settings').delete().in('key', [...ANNOUNCEMENT_KEYS]);
    if (error) return failed('remove banner', error);
    revalidatePath('/admin', 'layout');
    revalidatePath('/');
    return { ok: true, message: 'Banner removed.' };
  }

  const now = new Date().toISOString();
  const { error } = await db.from('settings').upsert(
    [
      { key: 'announcement', value: banner.message, updated_at: now },
      { key: 'announcement_title', value: banner.title, updated_at: now },
      { key: 'announcement_theme', value: banner.theme, updated_at: now },
      { key: 'announcement_active', value: banner.active ? 'true' : 'false', updated_at: now },
    ],
    { onConflict: 'key' },
  );
  if (error) return failed('save banner', error);

  revalidatePath('/admin', 'layout');
  revalidatePath('/');
  return { ok: true, message: banner.active ? 'Banner saved and live.' : 'Banner saved (switched off).' };
}

export async function addBlockedWords(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const db = await getAdminClient();

  const raw = formData.get('words');
  if (typeof raw !== 'string') return { error: 'Invalid request.' };

  const { words, rejected } = parseWordList(raw);
  if (rejected.length > 0) {
    return { error: `Each entry must be ${WORD_MAX} characters or fewer.` };
  }
  if (words.length === 0) return { error: 'Enter at least one word.' };
  if (words.length > MAX_WORDS_PER_SUBMIT) {
    return { error: `Add at most ${MAX_WORDS_PER_SUBMIT} words at a time.` };
  }

  const { error } = await db
    .from('blocked_words')
    .upsert(
      words.map((word) => ({ word })),
      { onConflict: 'word', ignoreDuplicates: true },
    );
  if (error) return failed('add blocked words', error);

  revalidatePath('/admin', 'layout');
  return { ok: true, message: `Saved ${words.length} ${words.length === 1 ? 'word' : 'words'}.` };
}

export async function removeBlockedWord(word: string): Promise<ActionResult> {
  const db = await getAdminClient();
  if (typeof word !== 'string' || word.length === 0 || word.length > WORD_MAX) {
    return { ok: false, error: 'Invalid request.' };
  }

  const { error } = await db.from('blocked_words').delete().eq('word', word);
  if (error) {
    console.error(`[admin] remove blocked word: ${describe(error)}`);
    return { ok: false, error: FAILED };
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
