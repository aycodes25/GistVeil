'use client';

import {
  Ban,
  ChevronRight,
  CirclePlus,
  FileText,
  House,
  LayoutGrid,
  LogOut,
  Settings,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { useMobileNav } from './MobileNav';
import { UserChip } from './UserChip';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
}

const community: NavItem[] = [
  {
    label: 'Home Feed',
    href: '/',
    icon: <House aria-hidden />,
    // A post's own page belongs to the feed; New Post is its own item.
    isActive: (p) => p === '/' || (p.startsWith('/post/') && p !== '/post/new'),
  },
  { label: 'New Post', href: '/post/new', icon: <CirclePlus aria-hidden />, isActive: (p) => p === '/post/new' },
];

const adminControl: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutGrid aria-hidden />, isActive: (p) => p === '/admin' },
  { label: 'Reports', href: '/admin/reports', icon: <TriangleAlert aria-hidden />, isActive: (p) => p.startsWith('/admin/reports') },
  { label: 'Content', href: '/admin/content', icon: <FileText aria-hidden />, isActive: (p) => p.startsWith('/admin/content') },
  { label: 'Bans', href: '/admin/bans', icon: <Ban aria-hidden />, isActive: (p) => p.startsWith('/admin/bans') },
  { label: 'Settings', href: '/admin/settings', icon: <Settings aria-hidden />, isActive: (p) => p.startsWith('/admin/settings') },
];

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('px-3 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase', className)}>{children}</p>
  );
}

// The left navigation. The public variant lists only the community pages; the admin variant adds
// ADMIN CONTROL and Sign Out. Admin links never appear on the public variant.
export function Sidebar({
  variant,
  logoutAction,
}: {
  variant: 'public' | 'admin';
  logoutAction?: () => Promise<void>;
}) {
  const pathname = usePathname();
  const { setOpen } = useMobileNav();

  const renderItem = (item: NavItem) => {
    const active = item.isActive(pathname);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors [&>svg]:size-[18px]',
            active ? 'bg-divider text-ink' : 'text-muted hover:bg-black/5 hover:text-ink',
          )}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          {active && <ChevronRight aria-hidden className="size-4 text-muted" />}
        </Link>
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col px-4 pt-[39px] pb-5">
      <Link href="/" onClick={() => setOpen(false)} aria-label="GistVeil home" className="block px-1">
        <Logo height={36} eager />
      </Link>

      <nav aria-label={variant === 'admin' ? 'Community and admin' : 'Community'} className="mt-[29px] flex-1 overflow-y-auto">
        <SectionLabel>Community</SectionLabel>
        <ul className="mt-2 space-y-1">{community.map(renderItem)}</ul>
        {variant === 'admin' && (
          <>
            <SectionLabel className="mt-6">Admin Control</SectionLabel>
            <ul className="mt-2 space-y-1">{adminControl.map(renderItem)}</ul>
          </>
        )}
      </nav>

      <div className="border-t border-border pt-4">
        {variant === 'admin' ? (
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10 [&>svg]:size-[18px]"
            >
              <LogOut aria-hidden />
              Sign Out
            </button>
          </form>
        ) : (
          <p className="text-center text-sm font-medium text-ink">
            <UserChip />
          </p>
        )}
      </div>
    </div>
  );
}
