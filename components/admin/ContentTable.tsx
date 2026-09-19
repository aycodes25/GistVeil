'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { deleteContent, setHidden, setPinned } from '@/app/admin/actions/moderation';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RowMenu, RowMenuItem, RowMenuLink, useRowMenu } from '@/components/ui/RowMenu';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/Table';
import { bulkMessage, runBulk } from '@/lib/admin/bulk';
import type { ActionResult } from '@/lib/admin/types';
import type { TargetType } from '@/lib/admin/validate';
import { BanButton } from './BanButton';

// A content row with everything derived on the server (short reference, status, "2 hours ago"),
// so the browser never reads the clock.
export interface ContentTableRow {
  type: TargetType;
  id: string;
  postId: string;
  body: string;
  categoryLabel: string | null;
  authorId: string;
  authorName: string;
  hidden: boolean;
  pinned: boolean;
  reportCount: number;
  ref: string;
  status: { label: string; tone: BadgeTone };
  when: string;
}

const key = (row: { type: TargetType; id: string }) => `${row.type}:${row.id}`;

// One menu entry that runs a server action, optionally asking for a second click first.
function MenuAction({
  label,
  confirmLabel,
  tone,
  run,
}: {
  label: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  run: () => Promise<ActionResult>;
}) {
  const { close } = useRowMenu();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <RowMenuItem
        tone={tone}
        disabled={pending}
        onClick={() => {
          if (confirmLabel && !armed) return setArmed(true);
          setError(null);
          startTransition(async () => {
            const result = await run();
            if (result.ok) close();
            else setError(result.error);
            setArmed(false);
          });
        }}
      >
        {pending ? 'Working…' : armed ? confirmLabel : label}
      </RowMenuItem>
      {error && (
        <p role="alert" className="px-3 pb-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </>
  );
}

function MenuBan({ onBan }: { onBan: () => void }) {
  const { close } = useRowMenu();
  return (
    <RowMenuItem
      tone="danger"
      onClick={() => {
        close();
        onBan();
      }}
    >
      Ban author…
    </RowMenuItem>
  );
}

export function ContentTable({ rows }: { rows: ContentTableRow[] }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [banning, setBanning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [armedDelete, setArmedDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(key(row)));

  function toggle(row: ContentTableRow) {
    const next = new Set(selected);
    if (next.has(key(row))) next.delete(key(row));
    else next.add(key(row));
    setSelected(next);
    setArmedDelete(false);
  }

  async function bulk(kind: 'hide' | 'unhide' | 'delete') {
    const chosen = rows.filter((row) => selected.has(key(row)));
    if (chosen.length === 0) return;
    setBusy(true);
    setMessage(null);
    const outcome = await runBulk(chosen, (row) =>
      kind === 'delete' ? deleteContent(row.type, row.id) : setHidden(row.type, row.id, kind === 'hide'),
    );
    setMessage(bulkMessage(outcome, kind === 'hide' ? 'Hid' : kind === 'unhide' ? 'Unhid' : 'Deleted'));
    setSelected(new Set());
    setArmedDelete(false);
    setBusy(false);
  }

  if (rows.length === 0) {
    return <p className="px-6 py-14 text-center text-sm text-muted">Nothing matches these filters.</p>;
  }

  return (
    <div>
      {(selected.size > 0 || message) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft bg-primary-soft px-4 py-3 text-sm">
          {selected.size > 0 && (
            <>
              <span className="font-medium text-ink">{selected.size} selected</span>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk('hide')}>
                Hide
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => bulk('unhide')}>
                Unhide
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => (armedDelete ? bulk('delete') : setArmedDelete(true))}
              >
                {armedDelete ? `Confirm delete ${selected.size}` : 'Delete forever'}
              </Button>
              {armedDelete && (
                <button type="button" onClick={() => setArmedDelete(false)} className="text-xs text-muted hover:text-ink">
                  Cancel
                </button>
              )}
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
                  aria-label="Select all rows on this page"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(key)))}
                  className="size-4 accent-primary"
                />
              </Th>
              <Th>ID</Th>
              <Th>Type</Th>
              <Th>Content preview</Th>
              <Th>Author</Th>
              <Th>Status</Th>
              <Th>Timestamp</Th>
              <Th className="text-right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row) => {
              const main = (
                <Tr key={key(row)}>
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
                  <Td className="text-sm whitespace-nowrap">{row.type === 'post' ? 'Post' : 'Reply'}</Td>
                  <Td className="max-w-[24rem]">
                    <p className="line-clamp-2 text-sm [overflow-wrap:anywhere]">{row.body}</p>
                    {row.categoryLabel && (
                      <Badge tone="primary" size="xs" className="mt-1.5">
                        {row.categoryLabel}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-sm whitespace-nowrap">{row.authorName}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={row.status.tone} size="xs">
                        {row.status.label}
                      </Badge>
                      {row.pinned && (
                        <Badge tone="primary" size="xs">
                          Pinned
                        </Badge>
                      )}
                    </div>
                  </Td>
                  <Td className="text-xs whitespace-nowrap text-muted">{row.when}</Td>
                  <Td className="text-right">
                    <RowMenu label={`Actions for ${row.ref}`}>
                      <RowMenuLink href={`/post/${row.postId}`} target="_blank" rel="noreferrer">
                        {row.type === 'post' ? 'View post' : 'View thread'} ↗
                      </RowMenuLink>
                      <MenuAction
                        label={row.hidden ? 'Unhide' : 'Hide'}
                        run={() => setHidden(row.type, row.id, !row.hidden)}
                      />
                      {row.type === 'post' && (
                        <MenuAction
                          label={row.pinned ? 'Unpin' : 'Pin to top of feed'}
                          run={() => setPinned(row.id, !row.pinned)}
                        />
                      )}
                      <MenuAction
                        label="Delete forever"
                        confirmLabel="Confirm delete"
                        tone="danger"
                        run={() => deleteContent(row.type, row.id)}
                      />
                      <MenuBan onBan={() => setBanning(key(row))} />
                    </RowMenu>
                  </Td>
                </Tr>
              );
              if (banning !== key(row)) return [main];
              return [
                main,
                <tr key={`${key(row)}-ban`} className="bg-sunken/60">
                  <td colSpan={8} className="px-4 pt-1 pb-4">
                    <BanButton
                      anonUserId={row.authorId}
                      authorName={row.authorName}
                      defaultOpen
                      onClose={() => setBanning(null)}
                    />
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </Table>
      </TableWrap>
      <p className="sr-only">
        <Link href="/admin/content">Reset filters</Link>
      </p>
    </div>
  );
}
