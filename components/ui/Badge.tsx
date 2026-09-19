import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-muted',
  primary: 'bg-chip text-primary',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-600',
  info: 'bg-cyan-100 text-cyan-700',
};

export function Badge({
  tone = 'neutral',
  shape = 'pill',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: BadgeTone; shape?: 'pill' | 'square' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] leading-4 font-semibold whitespace-nowrap',
        shape === 'pill' ? 'rounded-full' : 'rounded-md',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
