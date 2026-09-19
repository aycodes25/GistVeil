// Things this browser remembers about what it has done, kept in localStorage: which replies it has
// upvoted, which posts and replies it has reported, and whether the "Gentle Reminder" was dismissed.
// Voting and reporting are once per browser, and the server enforces its own limit per device
// token; this is what keeps the buttons honest between visits.
//
// Every write announces itself (CHANGE_EVENT), so components can read this through
// useSyncExternalStore with `subscribeLocalActions` and update the moment something changes.

const VOTED_KEY = 'gistveil_voted_advice_ids';
const REPORTED_KEY = 'gistveil_reported_ids';
const REMINDER_KEY = 'gistveil_reminder_dismissed';

export const CHANGE_EVENT = 'gistveil:local-actions';

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function announce() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function addToSet(key: string, value: string) {
  const set = readSet(key);
  set.add(value);
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Storage full or blocked (private mode): the action itself already succeeded on the server.
  }
  announce();
}

export function hasVoted(adviceId: string): boolean {
  return readSet(VOTED_KEY).has(adviceId);
}

export function markVoted(adviceId: string) {
  addToSet(VOTED_KEY, adviceId);
}

export function hasReported(targetId: string): boolean {
  return readSet(REPORTED_KEY).has(targetId);
}

export function markReported(targetId: string) {
  addToSet(REPORTED_KEY, targetId);
}

export function isReminderDismissed(): boolean {
  try {
    return localStorage.getItem(REMINDER_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissReminder() {
  try {
    localStorage.setItem(REMINDER_KEY, '1');
  } catch {
    // Not remembered, but the banner still closes for this visit (see ReminderBanner).
  }
  announce();
}

// For useSyncExternalStore. "storage" covers other tabs; CHANGE_EVENT covers this one, where
// localStorage writes do not fire "storage".
export function subscribeLocalActions(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
