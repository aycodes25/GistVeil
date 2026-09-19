import type { ReactNode } from 'react';
import { logout } from '@/app/admin/actions/auth';
import type { Crumb } from '@/components/ui/Breadcrumbs';
import { MobileDrawer, MobileNavProvider } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

// The frame around every admin page. Same structure as the public shell, plus ADMIN CONTROL and
// Sign Out in the sidebar; its search box searches the content list. It is not a security boundary:
// every admin page and action still authenticates for itself.
export function AdminShell({
  crumbs,
  title,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  children: ReactNode;
}) {
  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-page font-sans text-ink [color-scheme:light]">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r-2 border-border bg-sidebar lg:block">
          <Sidebar variant="admin" logoutAction={logout} />
        </aside>
        <MobileDrawer>
          <Sidebar variant="admin" logoutAction={logout} />
        </MobileDrawer>

        <div className="flex min-h-screen flex-col lg:pl-64">
          <TopBar
            crumbs={crumbs}
            title={title}
            searchAction="/admin/content"
            searchPlaceholder="Search content..."
            right="Administrator"
          />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
