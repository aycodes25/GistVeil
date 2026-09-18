// TTL cache with a safe fallback for the blocked-words list. Kept free of Supabase so its
// behaviour can be unit-tested; lib/blockedWords.ts wires it to the real table.
//
// The key property: fetching the list must NEVER stop someone from posting. On any failure
// the loader returns the last good list, or [] if there has never been one, and it does not
// cache the failure, so the very next call tries again.

export function createWordsLoader({
  load,
  ttlMs,
  now = Date.now,
}: {
  load: () => Promise<string[]>;
  ttlMs: number;
  now?: () => number;
}): () => Promise<string[]> {
  let cached: { words: string[]; at: number } | null = null;

  return async () => {
    if (cached && now() - cached.at < ttlMs) return cached.words;

    try {
      const words = await load();
      cached = { words, at: now() };
      return words;
    } catch {
      return cached?.words ?? [];
    }
  };
}
