import { hasAdminSession } from '@/lib/admin/auth';
import { getAdminClient } from '@/lib/admin/client';
import { csvRow } from '@/lib/admin/csv';
import {
  EXPORT_COLUMNS,
  EXPORT_PAGE_SIZE,
  fetchExportPage,
  type ExportRow,
} from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

// GET /admin/export?type=posts|advices&format=json|csv
// Streams the file in pages of EXPORT_PAGE_SIZE rows, so neither the API's 1000-row response
// cap nor a serverless response-size limit applies, and memory stays flat however large the
// table grows. If a page fails partway, the stream is errored rather than closed, so the
// download fails visibly instead of producing a valid-looking but truncated file.
export async function GET(request: Request) {
  // proxy.ts already answers 401 for /admin/export; this is the check that actually protects
  // the data if the proxy is ever bypassed or its matcher changes.
  if (!(await hasAdminSession())) return new Response(null, { status: 401 });

  const params = new URL(request.url).searchParams;
  const kind = params.get('type');
  const format = params.get('format');
  if ((kind !== 'posts' && kind !== 'advices') || (format !== 'json' && format !== 'csv')) {
    return new Response('Expected type=posts|advices and format=json|csv.', { status: 400 });
  }

  const db = await getAdminClient(); // verifies again; obtained once, before streaming starts
  const columns = EXPORT_COLUMNS[kind];
  const encoder = new TextEncoder();

  let stage: 'head' | 'rows' | 'tail' = 'head';
  let offset = 0;
  let wroteRow = false;

  function render(row: ExportRow): string {
    if (format === 'csv') return `${csvRow(columns.map((column) => row[column] ?? null))}\r\n`;
    const text = JSON.stringify(Object.fromEntries(columns.map((column) => [column, row[column] ?? null])));
    const separated = wroteRow ? `,${text}` : text;
    wroteRow = true;
    return separated;
  }

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (stage === 'head') {
          // The BOM lets Excel read UTF-8 (accents, emoji) correctly.
          controller.enqueue(encoder.encode(format === 'csv' ? `﻿${csvRow(columns)}\r\n` : '['));
          stage = 'rows';
        } else if (stage === 'rows') {
          const rows = await fetchExportPage(db, kind, offset);
          if (rows.length > 0) {
            controller.enqueue(encoder.encode(rows.map(render).join('')));
            offset += rows.length;
          }
          if (rows.length < EXPORT_PAGE_SIZE) stage = 'tail';
        } else {
          if (format === 'json') controller.enqueue(encoder.encode(']'));
          controller.close();
        }
      } catch (error) {
        console.error(`[admin] export failed: ${error instanceof Error ? error.message : error}`);
        controller.error(error);
      }
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      'content-type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="gistveil-${kind}-${date}.${format}"`,
      'x-content-type-options': 'nosniff',
    },
  });
}
