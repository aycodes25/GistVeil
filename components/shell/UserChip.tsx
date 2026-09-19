'use client';

import { useSyncExternalStore } from 'react';
import { readAnonName, subscribeIdentity } from '@/lib/identityStore';

// The visitor's own display name. Shows "Anonymous" until this browser has an identity, which is
// only created on the first post, vote or report.
export function UserChip({ className }: { className?: string }) {
  const name = useSyncExternalStore(subscribeIdentity, readAnonName, () => null);
  return <span className={className}>{name ?? 'Anonymous'}</span>;
}
