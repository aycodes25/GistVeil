import { createWordsLoader } from './blockedWordsCache';
import { supabase } from './supabaseClient';

// Extra blocked words maintained in the admin (table `blocked_words`, readable by the anon
// role). The client-side safety filter merges them with its built-in list. Cached for five
// minutes so a burst of posts doesn't refetch, and failure-proof: see blockedWordsCache.ts.
// Note the list is necessarily public to anyone holding the anon key, since the filter runs
// in the browser.
export const fetchBlockedWords = createWordsLoader({
  ttlMs: 5 * 60 * 1000,
  load: async () => {
    const { data, error } = await supabase.from('blocked_words').select('word');
    if (error) throw error;
    return (data ?? []).map((row) => String(row.word));
  },
});
