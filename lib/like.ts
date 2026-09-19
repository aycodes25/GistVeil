// Escapes the LIKE metacharacters so user search text matches literally.
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}
