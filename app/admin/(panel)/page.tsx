import { verifyAdmin } from '@/lib/admin/auth';

// Placeholder shell; the stats dashboard replaces this in a later task.
export default async function DashboardPage() {
  await verifyAdmin();

  return (
    <main>
      <h1 className="text-xl font-bold text-white">Dashboard</h1>
      <p className="mt-2 text-neutral-400">Signed in.</p>
    </main>
  );
}
