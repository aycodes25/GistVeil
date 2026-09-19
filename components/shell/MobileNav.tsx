'use client';

import { Menu, X } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Below 1024px the sidebar becomes a slide-over drawer. The top bar's menu button and the drawer
// live in different parts of the tree, so they share their open state through this context.

interface MobileNavState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNavState | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav(): MobileNavState {
  return useContext(MobileNavContext) ?? { open: false, setOpen: () => {} };
}

export function MobileMenuButton() {
  const { open, setOpen } = useMobileNav();
  return (
    <button
      type="button"
      aria-label="Open menu"
      aria-expanded={open}
      onClick={() => setOpen(true)}
      className="grid size-10 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-sunken lg:hidden"
    >
      <Menu aria-hidden className="size-5" />
    </button>
  );
}

export function MobileDrawer({ children }: { children: ReactNode }) {
  const { open, setOpen } = useMobileNav();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative h-full w-64 bg-sidebar shadow-xl">
        {children}
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
