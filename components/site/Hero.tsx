import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import { ButtonLink, buttonClasses } from '@/components/ui/Button';
import heroImage from '@/public/images/hero.png'; // imported, so a replaced file is never served stale

// How much of the page colour is laid over the artwork at each height (0 = top, 1 = bottom).
// Sampled from the mockup, whose veil lightens slowly through the middle and then quickly to the
// page colour at the foot, where the filter bar overlaps it.
const FADE: ReadonlyArray<readonly [at: number, alpha: number]> = [
  [0, 0],
  [0.1, 0.03],
  [0.18, 0.08],
  [0.26, 0.11],
  [0.34, 0.13],
  [0.43, 0.17],
  [0.51, 0.23],
  [0.59, 0.36],
  [0.68, 0.5],
  [0.76, 0.62],
  [0.84, 0.75],
  [0.92, 0.9],
  [1, 1],
];
const fade = `linear-gradient(to bottom, ${FADE.map(
  ([at, alpha]) => `color-mix(in srgb, var(--color-page) ${alpha * 100}%, transparent) ${at * 100}%`,
).join(', ')})`;

// The feed's opening panel: the veil artwork, fading into the page at its foot so the filter bar
// can overlap it. The dark headline and light subtitle are the mockup's own contrast choices;
// a soft shadow keeps the subtitle legible where the artwork is pale.
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[420px] items-center justify-center overflow-hidden px-4 pt-14 pb-24 text-center lg:h-[480px] lg:py-0">
      {/* One pixel short of the bottom: the browser paints an image's last row a pixel past its
          box, which showed as a hairline under the fade. The fade's last row is opaque page colour. */}
      <div aria-hidden className="absolute inset-x-0 top-0 bottom-px -z-20">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) calc(100vw - 256px), 100vw"
          className="object-cover object-center"
        />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10" style={{ backgroundImage: fade }} />

      <div className="flex max-w-3xl flex-col items-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/85 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
          <Sparkles aria-hidden className="size-3" />
          Refined Anonymity
        </span>
        <h2 className="mt-6 font-heading text-4xl leading-[1.1] font-semibold tracking-[-0.01em] text-ink sm:text-5xl">
          A Safe Space for Unfiltered Advice
        </h2>
        <p className="mt-7 max-w-[650px] text-base leading-7 font-medium text-white [text-shadow:0_1px_10px_rgb(60_30_110/0.55)] sm:text-lg sm:leading-[29px]">
          Post your problem anonymously and get real advice. Share your gist without revealing your
          veil.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/post/new" size="lg" className="px-8">
            Share Your Story
          </ButtonLink>
          <a
            href="#latest"
            className={buttonClasses({
              variant: 'secondary',
              size: 'lg',
              className: 'border-white/70 bg-white/60 px-8 backdrop-blur-sm hover:bg-white/80',
            })}
          >
            Browse Anonymously
          </a>
        </div>
      </div>
    </section>
  );
}
