import type { Metadata } from 'next';
import { verifyAdmin } from '@/lib/admin/auth';

export const metadata: Metadata = {
  title: 'GistVeil Admin',
  robots: { index: false, follow: false },
};

// Each admin page wraps itself in <AdminShell>, so it can set its own breadcrumbs and title. This
// layout only checks the session. That is not the security boundary (layouts don't re-render on
// navigation, so every page and action verifies for itself); it just avoids rendering anything for
// a signed-out visitor.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await verifyAdmin();
  return children;
}
