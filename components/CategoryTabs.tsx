import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import type { Category } from '@/lib/types';

export function CategoryTabs({ active }: { active: Category | 'all' }) {
  const tabs: { value: Category | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    ...CATEGORIES,
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === 'all' ? '/' : `/?category=${tab.value}`}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${
            active === tab.value
              ? 'bg-purple-600 text-white'
              : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
