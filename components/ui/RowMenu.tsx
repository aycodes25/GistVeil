'use client';

import { EllipsisVertical } from 'lucide-react';
import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

// The three-dot menu at the end of a table row. The popover is rendered in a portal with fixed
// positioning, so a table's scroll container can never clip it. It closes on outside click,
// Escape, scroll and resize, and supports arrow-key navigation between its items.

const MenuContext = createContext<{ close: () => void }>({ close: () => {} });

// Items call close() themselves once their action has finished. Not every click should close the
// menu: a two-step "Confirm delete" item has to stay open between its two clicks.
export const useRowMenu = () => useContext(MenuContext);

export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = position !== null;

  const close = useCallback(() => setPosition(null), []);

  function toggle() {
    if (open) return close();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 4, right: document.documentElement.clientWidth - rect.right });
  }

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    // Move focus into the menu so it is reachable from the keyboard.
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next].focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={toggle}
        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
      >
        <EllipsisVertical aria-hidden className="size-4" />
      </button>
      {position &&
        createPortal(
          <MenuContext.Provider value={{ close }}>
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              onKeyDown={onMenuKeyDown}
              style={{ top: position.top, right: position.right }}
              className="fixed z-50 min-w-48 rounded-xl border border-border-soft bg-page p-1 shadow-lg"
            >
              {children}
            </div>
          </MenuContext.Provider>,
          document.body,
        )}
    </>
  );
}

const itemClasses =
  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none disabled:opacity-50';

export function RowMenuItem({
  tone = 'default',
  className,
  ...props
}: ComponentProps<'button'> & { tone?: 'default' | 'danger' }) {
  return (
    <button
      role="menuitem"
      type="button"
      className={cn(itemClasses, tone === 'danger' ? 'text-danger' : 'text-ink', className)}
      {...props}
    />
  );
}

export function RowMenuLink({ className, ...props }: ComponentProps<typeof Link>) {
  const { close } = useRowMenu();
  return <Link role="menuitem" onClick={close} className={cn(itemClasses, 'text-ink', className)} {...props} />;
}
