'use client';

import { useEffect } from 'react';
import { AdminShell } from '@/components/shell/AdminShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function PanelError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AdminShell crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Error' }]} title="Something went wrong">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <Card className="p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Something went wrong</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This page couldn&apos;t load. Check the server logs
            {error.digest ? ` (reference ${error.digest})` : ''}. The usual causes are a missing service-role key in
            the server&apos;s environment, or supabase/admin.sql not having been run.
          </p>
          <Button className="mt-5" onClick={() => retry()}>
            Try again
          </Button>
        </Card>
      </div>
    </AdminShell>
  );
}
