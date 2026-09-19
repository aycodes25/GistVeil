// Pure input validation and normalisation for admin actions and pages. Server Action
// arguments come from the client, so every id and enum is re-checked here.

export const ANNOUNCEMENT_MAX = 280;
export const WORD_MAX = 60;
export const PAGE_SIZE = 25;

export type TargetType = 'post' | 'advice';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Any version: the seed data uses ids like 00000000-...-000000000001.
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isTargetType(value: unknown): value is TargetType {
  return value === 'post' || value === 'advice';
}

// Escapes the LIKE metacharacters so user search text matches literally. Shared with the public
// feed's search, so it lives outside the admin folder.
export { escapeLike } from '../like';

// Blocked-word input: comma- or newline-separated; entries are trimmed, lowercased and
// de-duplicated. Entries over WORD_MAX come back in `rejected` so the caller can say so.
export function parseWordList(input: string): { words: string[]; rejected: string[] } {
  const words: string[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();

  for (const raw of input.split(/[,\n\r]+/)) {
    const word = raw.trim().toLowerCase();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    if (word.length > WORD_MAX) rejected.push(word);
    else words.push(word);
  }

  return { words, rejected };
}

// An empty result is valid: it means "remove the announcement".
export function normalizeAnnouncement(
  input: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = input.trim();
  if (value.length > ANNOUNCEMENT_MAX) {
    return { ok: false, error: `Keep the announcement under ${ANNOUNCEMENT_MAX} characters.` };
  }
  return { ok: true, value };
}

// Page numbers come from the URL: anything that is not a positive integer becomes page 1.
export function parsePage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number.parseInt(value, 10);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

// Restricts a URL parameter to a known set of values.
export function pickOne<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
}
