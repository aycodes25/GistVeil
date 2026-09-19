'use client';

import { Check, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

// Shares a link to a page of this site. Phones (touch devices) get the system share sheet; on a
// desktop the link is copied, which is what people expect there. `path` is relative ("/post/…")
// and is made absolute in the browser.
export function ShareButton({
  path,
  title,
  variant = 'icon',
  className,
}: {
  path: string;
  title?: string;
  variant?: 'icon' | 'button';
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function share() {
    const url = new URL(path, window.location.origin).toString();

    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ url, title });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return; // closed the sheet
        // Any other failure: fall through and copy instead.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link', url); // no clipboard access (for example an insecure page)
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  const Icon = copied ? Check : Share2;
  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label={variant === 'icon' ? (copied ? 'Link copied' : 'Share this post') : undefined}
        title={variant === 'icon' ? (copied ? 'Link copied' : 'Share') : undefined}
        className={
          variant === 'icon'
            ? cn(
                'relative z-10 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink',
                copied && 'text-emerald-600',
                className,
              )
            : buttonClasses({ variant: 'secondary', size: 'md', className })
        }
      >
        <Icon aria-hidden className="size-4" />
        {variant === 'button' && (copied ? 'Link copied' : 'Share')}
      </button>
      <span role="status" className="sr-only">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </>
  );
}
