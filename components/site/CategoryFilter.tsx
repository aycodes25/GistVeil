import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { CATEGORIES } from '@/lib/categories';
import { feedHref } from '@/lib/feed';
import type { Category } from '@/lib/types';

// The card that overlaps the hero: category tabs and a search box. Tabs keep the active search and
// the search keeps the active category, so the two narrow the feed together.
export function CategoryFilter({ category, q }: { category?: Category; q: string }) {
  const items = [
    { label: 'All', href: feedHref({ q }), active: !category },
    ...CATEGORIES.map((c) => ({
      label: c.label,
      href: feedHref({ category: c.value, q }),
      active: category === c.value,
    })),
  ];

  return (
    <Card raised className="relative z-10 -mt-10 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between sm:px-[17px] sm:py-[15px]">
      <Tabs items={items} label="Filter posts by category" size="sm" className="min-w-0" />
      {/* Keyed by the phrase so the box follows the URL (for example after "Return Home"). */}
      <SearchInput
        key={q}
        action="/"
        defaultValue={q}
        placeholder="Search posts..."
        hidden={category ? { category } : undefined}
        size="lg"
        className="w-full shrink-0 sm:w-64"
      />
    </Card>
  );
}
