import Link from 'next/link';
import { site } from '@content/site';

export function Logo({
  className = '',
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Lessgo — home"
    >
      <span className="relative inline-flex h-9 w-9 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={site.logo}
          alt=""
          width={36}
          height={36}
          className="relative h-9 w-9 object-contain transition-transform duration-300 ease-spring group-hover:scale-105"
        />
      </span>
      {showWordmark ? (
        <span className="font-display text-[1.35rem] font-extrabold tracking-tight text-ink">
          Less<span className="text-gradient">go</span>
        </span>
      ) : null}
    </Link>
  );
}
