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

export function Card({
  tone = 'default',
  className,
  ...props
}: ComponentProps<'div'> & { tone?: CardTone }) {
  return (
    <div className={cn('rounded-card border border-border-soft shadow-card', tones[tone], className)} {...props} />
  );
}
