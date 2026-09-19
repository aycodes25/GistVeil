// Browser-side view of the visitor's anonymous identity, for display only. It never creates an
// identity (that still happens lazily, on the first post, vote or report, in anonIdentity.ts), so
// simply viewing a page never writes to the database.

export const IDENTITY_KEY = 'gistveil_identity';
export const IDENTITY_EVENT = 'gistveil:identity';

// The stored display name, e.g. "Anon #6400", or null when this browser has no identity yet.
export function readAnonName(): string | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { anon_name?: unknown };
    return typeof parsed.anon_name === 'string' ? parsed.anon_name : null;
  } catch {
    return null;
  }
}

// For useSyncExternalStore. "storage" covers other tabs; IDENTITY_EVENT covers this tab, where
// localStorage writes do not fire "storage".
export function subscribeIdentity(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(IDENTITY_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(IDENTITY_EVENT, callback);
  };
}
