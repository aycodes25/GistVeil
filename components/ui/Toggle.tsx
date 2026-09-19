'use client';

import { cn } from '@/lib/cn';

// An accessible on/off switch. When `name` is given it also submits its value ("true" / "false")
// with the surrounding form, so it works with Server Actions.
export function Toggle({
  checked,
  onChange,
  label,
  name,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  name?: string;
  disabled?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-divider',
        )}
      >
        <span
          className={cn(
            'size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
      {name && <input type="hidden" name={name} value={checked ? 'true' : 'false'} />}
    </>
  );
}
