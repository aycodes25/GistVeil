import Image from 'next/image';

// The supplied logo, cropped to its content (501x133), or just the hooded mark (143x133).
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
  const [src, ratio] = mark ? ['/images/logo-mark.png', 143 / 133] : ['/images/logo.png', 501 / 133];
  return (
    <Image
      src={src}
      alt="GistVeil"
      width={Math.round(ratio * height)}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
