import Image from 'next/image';
import fullLogo from '@/public/images/logo.png';
import markLogo from '@/public/images/logo-mark.png';

// The owner's logo, trimmed to its content (4px margin all round): the full lockup with the
// tagline, or just the hooded mark. The untouched original is design/brand/logo-source.png.
//
// The files are imported rather than referenced by URL: Next then fingerprints them, so a
// replaced logo is picked up at once instead of a cached copy of the old one being served.
//
// `height` is the rendered height in pixels; the width follows the image's aspect ratio.
export function Logo({
  height = 40,
  mark = false,
  priority,
  className,
}: {
  height?: number;
  mark?: boolean;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image src={mark ? markLogo : fullLogo} alt="GistVeil" height={height} priority={priority} className={className} />
  );
}
