import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export type CardTone = 'default' | 'wash' | 'soft' | 'promise';

// In the mockups a card is the same colour as the page, set apart by a hairline border and a soft
// shadow; a few cards carry a faint purple tint.
const tones: Record<CardTone, string> = {
  default: 'bg-page',
  wash: 'bg-wash',
  soft: 'bg-primary-soft',
  promise: 'bg-promise',
};

// Some cards in the mockups have an outline and some are lifted by the shadow alone.
const edges: Record<CardTone, string> = {
  default: 'border-divider',
  wash: 'border-divider',
  soft: 'border-divider',
  promise: 'border-promise-edge',
};

export function Card({
  tone = 'default',
  raised = false,
  outline = true,
  className,
  ...props
}: ComponentProps<'div'> & { tone?: CardTone; raised?: boolean; outline?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-card border',
        outline ? edges[tone] : 'border-transparent', // the 1px stays, so both kinds are the same size
        raised ? 'shadow-raised' : 'shadow-card',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
