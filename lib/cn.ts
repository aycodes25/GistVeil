// Joins class names, skipping falsy values. (No Tailwind class merging: components pick
// mutually exclusive variants instead of overriding each other.)
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
