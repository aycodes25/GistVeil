import Link from 'next/link';

// A headline number. Values use the default proportional figures: tabular-nums is for
// columns that must align, and makes a large standalone number look loose.
export function StatTile({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: number;
  note?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-white">{value.toLocaleString('en-US')}</div>
      {note && <div className="mt-1 text-xs text-neutral-500">{note}</div>}
    </>
  );

  const box = 'block rounded-lg border border-neutral-800 bg-neutral-900 p-4';
  return href ? (
    <Link href={href} className={`${box} hover:border-purple-600`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
