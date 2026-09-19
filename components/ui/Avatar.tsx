import { avatarTone } from '@/lib/present';
import { cn } from '@/lib/cn';

// Static class names so Tailwind can see them. Index comes from avatarTone(name).
const backgrounds = [
  'bg-avatar-1',
  'bg-avatar-2',
  'bg-avatar-3',
  'bg-avatar-4',
  'bg-avatar-5',
  'bg-avatar-6',
];

// A generated, anonymous avatar: a pastel disc (stable per name) with a head-and-shoulders
// silhouette. The mockups use photographs, which cannot be reproduced; this keeps the same
// footprint and feel without implying any real person.
export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full',
        backgrounds[avatarTone(name)],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} className="fill-ink/50">
        <circle cx="20" cy="16" r="7" />
        <path d="M5 40c0-9 6.5-14 15-14s15 5 15 14z" />
      </svg>
    </span>
  );
}
