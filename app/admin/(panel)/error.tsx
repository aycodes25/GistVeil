'use client';

import { useEffect } from 'react';

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
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-1 text-lg font-semibold text-white">Something went wrong</h2>
      <p className="mb-3 text-sm text-neutral-400">
        This page couldn&apos;t load. Check the server logs
        {error.digest ? ` (reference ${error.digest})` : ''} — the usual causes are a missing
        service-role key in the server&apos;s environment, or supabase/admin.sql not having been run.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
