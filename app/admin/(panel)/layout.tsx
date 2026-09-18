import type { Metadata } from 'next';
import { logout } from '@/app/admin/actions/auth';
import { verifyAdmin } from '@/lib/admin/auth';
import { NavLink } from '@/components/admin/NavLink';

export const metadata: Metadata = {
  title: 'GistVeil Admin',
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Not the security boundary (layouts don't re-render on navigation, so every page and
  // action verifies for itself); this just avoids rendering the shell for a signed-out visitor.
  await verifyAdmin();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-neutral-800 pb-4">
        <span className="text-lg font-bold text-white">GistVeil Admin</span>
        {/* On phones the nav takes its own full-width row (order-last) so "Sign out" stays on the title row. */}
        <nav
          aria-label="Admin"
          className="order-last flex w-full flex-wrap items-center gap-1 sm:order-none sm:w-auto"
        >
          <NavLink href="/admin" exact>
            Dashboard
          </NavLink>
          <NavLink href="/admin/reports">Reports</NavLink>
          <NavLink href="/admin/content">Content</NavLink>
          <NavLink href="/admin/bans">Bans</NavLink>
          <NavLink href="/admin/settings">Settings</NavLink>
        </nav>
        <form action={logout} className="ml-auto">
          <button type="submit" className="text-sm text-neutral-400 hover:text-white">
            Sign out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
