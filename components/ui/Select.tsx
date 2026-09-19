import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

// A styled native <select> (so it stays accessible and works without JavaScript). `className`
// sizes the wrapper; everything else goes to the select.
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <span className={cn('relative inline-block', className)}>
      <select
        className="h-10 w-full appearance-none rounded-xl border border-border-strong bg-page pr-9 pl-3.5 text-sm text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
}
