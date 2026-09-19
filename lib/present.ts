// Pure presentation helpers: no React, no DOM, no data access. Everything here derives display
// text from data the app already has, so nothing shown is invented.

const TITLE_MAX = 110;

// Words that end in a full stop without ending the sentence.
const ABBREVIATION = /(?:\b(?:e\.g|i\.e|vs|mr|mrs|ms|dr|etc)|\b[a-z])\.$/i;

// Where the first sentence ends: the index just AFTER its terminator, or -1. A terminator is . ! or ?
// followed by whitespace or the end of the text (so "3.5" and "e.g." do not end it); a line break
// also ends the title.
function firstSentenceEnd(text: string): number {
  const newline = text.indexOf('\n');
  const limit = newline === -1 ? text.length : newline;

  for (let i = 0; i < limit; i++) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    const next = text[i + 1];
    if (next !== undefined && !/\s/.test(next)) continue; // "3.5", "site.com"
    if (ch === '.' && ABBREVIATION.test(text.slice(0, i + 1))) continue;
    return i + 1;
  }
  return newline === -1 ? -1 : newline;
}

// The first sentence becomes a card/page title and the rest the excerpt. A first sentence longer
// than TITLE_MAX is cut at a word boundary and marked with an ellipsis; the remainder continues in
// the excerpt, so title + excerpt always carries the whole text.
export function splitPostText(text: string): { title: string; excerpt: string } {
  const body = text.trim();
  if (!body) return { title: '', excerpt: '' };

  const end = firstSentenceEnd(body);
  let title = end === -1 ? body : body.slice(0, end).trim();
  let rest = end === -1 ? '' : body.slice(end).trim();

  if (title.length > TITLE_MAX) {
    const window = title.slice(0, TITLE_MAX + 1);
    const lastSpace = window.lastIndexOf(' ');
    const cut = lastSpace > 0 ? lastSpace : TITLE_MAX;
    const remainder = title.slice(cut).trim();
    title = `${title.slice(0, cut).trim()}…`;
    rest = [remainder, rest].filter(Boolean).join(' ');
  }
  return { title, excerpt: rest };
}

export type Severity = 'low' | 'medium' | 'high';

// Reports carry no reason or severity of their own, so severity is derived from how many people
// reported the item.
export function severityFor(reportCount: number): Severity {
  if (reportCount >= 3) return 'high';
  if (reportCount === 2) return 'medium';
  return 'low';
}

export interface WeekDelta {
  label: string;
  direction: 'up' | 'down' | 'flat' | 'new';
}

// Change from the previous 7 days to the last 7 days. "New" when there was nothing to compare with.
export function weekDelta(current: number, previous: number): WeekDelta {
  if (previous === 0) {
    return current === 0 ? { label: '0%', direction: 'flat' } : { label: 'New', direction: 'new' };
  }
  const percent = ((current - previous) / previous) * 100;
  if (percent === 0) return { label: '0%', direction: 'flat' };
  const magnitude = Math.abs(percent).toFixed(1).replace(/\.0$/, '');
  return percent > 0
    ? { label: `+${magnitude}%`, direction: 'up' }
    : { label: `-${magnitude}%`, direction: 'down' };
}

// Short reference for tables, e.g. POST-8F3A1C. Derived from the real id.
export function shortRef(type: 'post' | 'advice', id: string): string {
  return `${type === 'post' ? 'POST' : 'REPLY'}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

// A stable palette index (0..5) for a name, so the same author always gets the same avatar colour.
export function avatarTone(seed: string): number {
  let hash = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 6;
}

// "September 19, 2026". Calendar date in UTC so server and client agree.
export function longDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// Today's date, in the same form. Lives here so a component can show it without calling the clock itself.
export function todayLongDate(): string {
  return longDate(new Date());
}
