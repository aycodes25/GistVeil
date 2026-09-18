const VOTED_KEY = 'gistveil_voted_advice_ids';
const REPORTED_KEY = 'gistveil_reported_ids';

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

export function hasVoted(adviceId: string): boolean {
  return readSet(VOTED_KEY).has(adviceId);
}

export function markVoted(adviceId: string) {
  const set = readSet(VOTED_KEY);
  set.add(adviceId);
  writeSet(VOTED_KEY, set);
}

export function hasReported(targetId: string): boolean {
  return readSet(REPORTED_KEY).has(targetId);
}

export function markReported(targetId: string) {
  const set = readSet(REPORTED_KEY);
  set.add(targetId);
  writeSet(REPORTED_KEY, set);
}
