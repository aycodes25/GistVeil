import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

// A search box that is a plain GET form, so it works without JavaScript. `hidden` carries other
// query parameters through (for example the active category).
export function SearchInput({
  action,
  name = 'q',
  defaultValue,
  placeholder,
  hidden,
  size = 'md',
  className,
}: {
  action: string;
  name?: string;
  defaultValue?: string;
  placeholder: string;
  hidden?: Record<string, string>;
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <form action={action} method="get" role="search" className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'w-full border border-border-strong bg-page pr-4 pl-10 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
          size === 'md' ? 'h-9 rounded-full' : 'h-10 rounded-xl',
        )}
      />
      {Object.entries(hidden ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </form>
  );
}
