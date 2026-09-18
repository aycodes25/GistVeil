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

export function checkSafety(text: string): SafetyResult {
  if (PHONE_PATTERN.test(text)) {
    return { ok: false, reason: 'Please remove phone numbers from your post.' };
  }

  const lower = text.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return { ok: false, reason: 'Please remove offensive language from your post.' };
    }
  }

  return { ok: true };
}
