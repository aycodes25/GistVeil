import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

// Table parts styled like the mockups: a sunken uppercase header band and hairline row rules.
// TableWrap lets a wide table scroll inside its card instead of breaking the page. It is `relative`
// so absolutely positioned descendants (the `sr-only` header labels) are clipped with the table
// rather than escaping to the page and widening it.

export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('relative overflow-x-auto', className)} {...props} />;
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full min-w-[720px] border-collapse text-left text-sm', className)} {...props} />;
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn('bg-sunken px-4 py-3 text-[11px] font-semibold tracking-wider text-muted uppercase', className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-t border-border-soft', className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 align-middle text-ink', className)} {...props} />;
}
