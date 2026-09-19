import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export type CardTone = 'default' | 'wash' | 'soft' | 'promise';

// In the mockups a card is the same colour as the page, set apart by a hairline border and a soft
// shadow; a few cards carry a faint purple tint.
const tones: Record<CardTone, string> = {
  default: 'bg-page border-divider',
  wash: 'bg-wash border-divider',
  soft: 'bg-primary-soft border-divider',
  promise: 'bg-promise border-promise-edge',
};

export function Card({
  tone = 'default',
  raised = false,
  className,
  ...props
}: ComponentProps<'div'> & { tone?: CardTone; raised?: boolean }) {
  return (
    <div
      className={cn('rounded-card border', raised ? 'shadow-raised' : 'shadow-card', tones[tone], className)}
      {...props}
    />
  );
}
