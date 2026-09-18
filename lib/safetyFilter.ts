// Blocks phone numbers and a small profanity list before any post/advice
// insert. This list is intentionally short and mild here — extend it with
// slurs/profanity relevant to your audience in a private config rather
// than committing an exhaustive list to a public repo.

const PHONE_PATTERN = /(\+?\d[\s-]?){7,}/;

const BLOCKED_WORDS = ['fuck', 'shit', 'bitch', 'idiot', 'stupid'];

export interface SafetyResult {
  ok: boolean;
  reason?: string;
}

// `extraWords` are additional blocked words managed in the admin (see lib/blockedWords.ts).
// They are matched exactly like the built-in list. Blank entries are skipped: an empty
// string is a substring of everything and would otherwise block every post.
export function checkSafety(text: string, extraWords: readonly string[] = []): SafetyResult {
  if (PHONE_PATTERN.test(text)) {
    return { ok: false, reason: 'Please remove phone numbers from your post.' };
  }

  const lower = text.toLowerCase();
  for (const raw of [...BLOCKED_WORDS, ...extraWords]) {
    const word = raw.trim().toLowerCase();
    if (word && lower.includes(word)) {
      return { ok: false, reason: 'Please remove offensive language from your post.' };
    }
  }

  return { ok: true };
}
