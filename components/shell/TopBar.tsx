import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs';
import { SearchInput } from '@/components/ui/SearchInput';
import { MobileMenuButton } from './MobileNav';

// The top bar: breadcrumbs above the page title, the search box, and who is looking. The title is
// the page's <h1>. On phones the search box moves to its own row under the bar.
export function TopBar({
  crumbs,
  title,
  searchAction,
  searchPlaceholder,
  right,
}: {
  crumbs: Crumb[];
  title: string;
  searchAction: string;
  searchPlaceholder: string;
  right: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-border bg-page">
      <div className="flex h-[63px] items-center gap-3 px-4 lg:px-6">
        <MobileMenuButton />
        <div className="min-w-0 flex-1">
          <Breadcrumbs items={crumbs} />
          <h1 className="truncate mt-1.5 font-heading text-lg leading-6 font-medium text-ink">{title}</h1>
        </div>
        <SearchInput
          action={searchAction}
          placeholder={searchPlaceholder}
          className="hidden w-64 shrink-0 md:block"
        />
        <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />
        <div className="hidden shrink-0 text-sm font-medium text-ink sm:block">{right}</div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchInput action={searchAction} placeholder={searchPlaceholder} size="lg" />
      </div>
    </header>
  );
}
