'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/admin/client';
import type { ActionResult, SettingsFormState } from '@/lib/admin/types';
import { WORD_MAX, normalizeAnnouncement, parseWordList } from '@/lib/admin/validate';

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

export async function saveAnnouncement(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const db = await getAdminClient();

  const raw = formData.get('announcement');
  if (typeof raw !== 'string') return { error: 'Invalid request.' };

  const result = normalizeAnnouncement(raw);
  if (!result.ok) return { error: result.error };

  // An empty announcement means "remove the banner".
  const { error } =
    result.value === ''
      ? await db.from('settings').delete().eq('key', 'announcement')
      : await db
          .from('settings')
          .upsert(
            { key: 'announcement', value: result.value, updated_at: new Date().toISOString() },
            { onConflict: 'key' },
          );
  if (error) return failed('save announcement', error);

  revalidatePath('/admin', 'layout');
  revalidatePath('/');
  return { ok: true, message: result.value === '' ? 'Announcement removed.' : 'Announcement saved.' };
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
