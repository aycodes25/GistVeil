import type { ReactNode } from 'react';
import type { Crumb } from '@/components/ui/Breadcrumbs';
import { MobileDrawer, MobileNavProvider } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { UserChip } from './UserChip';

// The frame around every public page: sidebar (a drawer below 1024px), top bar, footer. Pages wrap
// themselves so they can set their own breadcrumbs and title.
export function PublicShell({
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
          <Sidebar variant="public" />
        </aside>
        <MobileDrawer>
          <Sidebar variant="public" />
        </MobileDrawer>

        <div className="flex min-h-screen flex-col lg:pl-64">
          <TopBar
            crumbs={crumbs}
            title={title}
            searchAction="/"
            searchPlaceholder="Search content..."
            right={<UserChip />}
          />
          {/* overflow-x: clip (not hidden) keeps a wide decorative element from adding a sideways scroll
              on phones without turning <main> into a scroll container, so the sticky top bar still works. */}
          <main className="flex-1 overflow-x-clip">{children}</main>
          <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted lg:px-8">
            © {new Date().getFullYear()} GistVeil Anonymous Community. All rights reserved.
          </footer>
        </div>
      </div>
    </MobileNavProvider>
  );
}
