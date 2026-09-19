'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { deleteContent, dismissReports, setHidden } from '@/app/admin/actions/moderation';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/Table';
import { bulkMessage, runBulk } from '@/lib/admin/bulk';
import type { TargetType } from '@/lib/admin/validate';
import { ActionButton } from './ActionButton';
import { BanButton } from './BanButton';

// A report row, with everything derived on the server (short reference, severity, "12m ago") so the
// browser never has to read the clock.
export interface ReportTableRow {
  type: TargetType;
  id: string;
  postId: string;
  body: string;
  categoryLabel: string | null;
  authorId: string;
  authorName: string;
  reportCount: number;
  ref: string;
  severity: { label: string; tone: BadgeTone };
  reportedAgo: string;
}

const key = (row: { type: TargetType; id: string }) => `${row.type}:${row.id}`;

export function ReportsTable({ rows }: { rows: ReportTableRow[] }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(key(row)));

  function toggle(row: ReportTableRow) {
    const next = new Set(selected);
    if (next.has(key(row))) next.delete(key(row));
    else next.add(key(row));
    setSelected(next);
  }

  async function bulk(kind: 'dismiss' | 'hide') {
    const chosen = rows.filter((row) => selected.has(key(row)));
    if (chosen.length === 0) return;
    setBusy(true);
    setMessage(null);
    const outcome = await runBulk(chosen, (row) =>
      kind === 'dismiss' ? dismissReports(row.type, row.id) : setHidden(row.type, row.id, true),
    );
    setMessage(bulkMessage(outcome, kind === 'dismiss' ? 'Dismissed reports on' : 'Hid'));
    setSelected(new Set());
    setBusy(false);
  }

  if (rows.length === 0) {
    return <p className="px-6 py-14 text-center text-sm text-muted">No open reports match. Nothing needs review.</p>;
  }

  return (
    <div>
      {(selected.size > 0 || message) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft bg-primary-soft px-4 py-3 text-sm">
          {selected.size > 0 && (
            <>
              <span className="font-medium text-ink">{selected.size} selected</span>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk('dismiss')}>
                Dismiss reports
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk('hide')}>
                Hide
              </Button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-muted hover:text-ink">
                Clear
              </button>
            </>
          )}
          {message && (
            <p role="status" className="text-ink">
              {message}
            </p>
          )}
        </div>
      )}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th className="w-10 pr-0">
                <input
                  type="checkbox"
                  aria-label="Select all reports on this page"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(key)))}
                  className="size-4 accent-primary"
                />
              </Th>
              <Th>ID</Th>
              <Th>Reports</Th>
              <Th>Content</Th>
              <Th>Severity</Th>
              <Th>Reported</Th>
              <Th>Status</Th>
              <Th className="text-right">
                <span className="sr-only">Review</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row) => {
              const isOpen = open === key(row);
              const main = (
                <Tr key={key(row)} className={isOpen ? 'bg-sunken/60' : undefined}>
                  <Td className="w-10 pr-0">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.ref}`}
                      checked={selected.has(key(row))}
                      onChange={() => toggle(row)}
                      className="size-4 accent-primary"
                    />
                  </Td>
                  <Td className="font-mono text-xs whitespace-nowrap text-muted">{row.ref}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="font-medium">
                      {row.reportCount} {row.reportCount === 1 ? 'report' : 'reports'}
                    </span>
                    <span className="block text-xs text-muted">{row.type === 'post' ? 'Post' : 'Reply'}</span>
                  </Td>
                  <Td className="max-w-[26rem]">
                    <p className="line-clamp-2 text-sm [overflow-wrap:anywhere]">{row.body}</p>
                  </Td>
                  <Td>
                    <Badge tone={row.severity.tone} size="xs">
                      {row.severity.label}
                    </Badge>
                  </Td>
                  <Td className="text-xs whitespace-nowrap text-muted">{row.reportedAgo}</Td>
                  <Td className="text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase">Pending</Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Close' : 'Review'} ${row.ref}`}
                      onClick={() => setOpen(isOpen ? null : key(row))}
                      className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
                    >
                      {isOpen ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                    </button>
                  </Td>
                </Tr>
              );
              if (!isOpen) return [main];
              return [
                main,
                <tr key={`${key(row)}-detail`} className="bg-sunken/60">
                  <td colSpan={8} className="px-4 pt-1 pb-5">
                    <div className="rounded-xl border border-border-soft bg-page p-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>{row.authorName}</span>
                        {row.categoryLabel && <Badge tone="primary" size="xs">{row.categoryLabel}</Badge>}
                        <Link
                          href={`/post/${row.postId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-primary hover:underline"
                        >
                          {row.type === 'post' ? 'View post' : 'View thread'} ↗
                        </Link>
                      </div>
                      <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{row.body}</p>
                      <div className="mt-4 flex flex-wrap items-start gap-2">
                        <ActionButton action={() => dismissReports(row.type, row.id)} label="Dismiss reports" />
                        <ActionButton action={() => setHidden(row.type, row.id, true)} label="Hide" />
                        <ActionButton
                          action={() => deleteContent(row.type, row.id)}
                          label="Delete forever"
                          confirmLabel="Confirm delete"
                          tone="danger"
                        />
                        <BanButton anonUserId={row.authorId} authorName={row.authorName} />
                      </div>
                    </div>
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
