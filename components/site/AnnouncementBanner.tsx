import { Megaphone, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BannerTheme } from '@/lib/announcement';
import { cn } from '@/lib/cn';

const themes: Record<BannerTheme, { box: string; chip: string; icon: ReactNode }> = {
  info: {
    box: 'border-primary/20 bg-primary-soft',
    chip: 'bg-chip text-primary',
    icon: <Megaphone aria-hidden />,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50',
    chip: 'bg-amber-100 text-amber-700',
    icon: <TriangleAlert aria-hidden />,
  },
  critical: {
    box: 'border-red-200 bg-red-50',
    chip: 'bg-red-100 text-red-600',
    icon: <OctagonAlert aria-hidden />,
  },
};

// The site-wide notice. The public feed shows the whole message; the admin's live preview passes
// `clamp` to keep it to one line, as the mockup does.
export function AnnouncementBanner({
  title,
  message,
  theme,
  clamp = false,
  className,
}: {
  title?: string;
  message: string;
  theme: BannerTheme;
  clamp?: boolean;
  className?: string;
}) {
  const style = themes[theme];
  return (
    <div
      role="note"
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3.5', style.box, className)}
    >
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full [&>svg]:size-4', style.chip)}>
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm leading-5 font-semibold text-ink">{title}</p>}
        <p
          className={cn(
            'text-sm leading-5 text-muted',
            clamp ? 'truncate' : 'whitespace-pre-wrap',
            !title && 'py-1.5 text-ink',
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
