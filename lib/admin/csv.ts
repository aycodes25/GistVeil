// CSV cell/row formatting for the data export. Post and advice bodies are user-written, so
// any cell that begins with a spreadsheet formula trigger is prefixed with an apostrophe to
// stop it being evaluated when the file is opened in Excel/Sheets/Numbers.

const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';

  // Real numbers and booleans are data, not user text: leave them unquoted and untouched
  // (a negative number must stay a number).
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  let text = String(value);
  if (text.length > 0 && FORMULA_TRIGGERS.has(text[0])) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// Cells joined by commas, without a line ending; the caller chooses the newline.
export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(',');
}
