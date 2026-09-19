import { ArrowLeft, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ButtonLink, buttonClasses } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import doorImage from '@/public/images/door.png'; // imported, so a replaced file is never served stale

// The mockup lightens the artwork toward its foot with the page colour: about 3% at the top rising
// to about 37% at the bottom (solved from its pixels).
const fade =
  'linear-gradient(to bottom, color-mix(in srgb, var(--color-page) 3%, transparent), color-mix(in srgb, var(--color-page) 37%, transparent))';

// "Lost in the Veil": the door image, a short explanation, Return Home, and a search box. Used for
// a page that does not exist (404) and for a search that finds nothing; the caller supplies the
// eyebrow label, the wording, and an optional second action.
export function NotFoundPanel({
  eyebrow,
  description,
  searchDefault,
  secondary,
}: {
  eyebrow: string;
  description: ReactNode;
  searchDefault?: string;
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="relative isolate grid items-center gap-10 py-6 lg:grid-cols-2 lg:gap-24 lg:py-10">
      <div aria-hidden className="absolute top-0 -left-10 -z-10 h-[420px] w-[560px] rounded-full bg-primary/[0.06] blur-3xl" />

      <div className="relative mx-auto w-full max-w-[400px] lg:mx-0 lg:ml-auto">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_14px_62px_-37px_rgb(0_0_0/0.87)]">
          <Image
            src={doorImage}
            alt="A curtain drifting in front of an old wooden door"
            fill
            sizes="(min-width: 1024px) 400px, 90vw"
            className="object-cover"
          />
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: fade }} />
        </div>
        <span className="absolute -right-4 -bottom-3 grid size-16 place-items-center rounded-xl border border-border-soft bg-page text-primary shadow-card sm:-right-6">
          <ShieldAlert aria-hidden className="size-7" />
        </span>
      </div>

      <div className="max-w-[420px]">
        <span className="inline-block rounded-full bg-chip px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
          {eyebrow}
        </span>
        <h2 className="mt-4 font-heading text-4xl leading-tight font-semibold tracking-[-0.01em] text-ink sm:text-5xl">
          Lost in the <span className="text-primary">Veil</span>
        </h2>
        <p className="mt-5 max-w-[380px] text-base leading-7 text-muted [overflow-wrap:anywhere]">{description}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <ButtonLink href="/" size="lg" className="min-w-44">
            <ArrowLeft aria-hidden className="size-4" />
            Return Home
          </ButtonLink>
          {secondary && (
            <a href={secondary.href} className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              {secondary.label}
            </a>
          )}
        </div>
        <SearchInput
          action="/"
          defaultValue={searchDefault}
          placeholder="Search for posts or topics..."
          size="xl"
          className="mt-8 w-full"
        />
      </div>
    </section>
  );
}
