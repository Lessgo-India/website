import type { ReactNode } from 'react';

/**
 * Device shell for the in-page app mockups.
 *
 * The mockups are decorative: everything they say is also stated in the
 * surrounding copy, so the whole frame is hidden from assistive tech.
 */
export function PhoneFrame({
  children,
  className = '',
  glow,
  float = false,
  size = 'default',
  decorative = true,
}: {
  children: ReactNode;
  className?: string;
  /** Accent colour for the ambient glow behind the device. */
  glow?: string;
  float?: boolean;
  size?: 'default' | 'hero';
  decorative?: boolean;
}) {
  return (
    <div aria-hidden={decorative || undefined} className={`relative ${className}`}>
      {glow ? (
        <div
          className="absolute inset-0 -z-10 translate-y-8 scale-90 rounded-[999px] blur-[70px]"
          style={{ background: glow, opacity: 0.32 }}
        />
      ) : null}

      <div
        className={[
          'relative mx-auto w-full rounded-[46px] p-[10px] shadow-phone',
          size === 'hero' ? 'max-w-[390px]' : 'max-w-[300px]',
          'bg-gradient-to-b from-[#3a3550] to-[#16132c]',
          float ? 'animate-float' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Hairline highlight along the bezel edge */}
        <div className="pointer-events-none absolute inset-0 rounded-[46px] ring-1 ring-inset ring-white/12" />

        <div className="relative aspect-[159/350] w-full overflow-hidden rounded-[37px]">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Initial-based avatar. Deterministic colour, no network request. */
export function Avatar({
  name,
  size = 22,
  ring,
}: {
  name: string;
  size?: number;
  ring?: string;
}) {
  const palettes = [
    ['#4776E6', '#8E54E9'],
    ['#FF512F', '#DD2476'],
    ['#11998E', '#38EF7D'],
    ['#F7971E', '#FFD200'],
    ['#DA22FF', '#9733EE'],
    ['#02AAB0', '#00CDAC'],
  ];
  const idx = name.charCodeAt(0) % palettes.length;
  const [from, to] = palettes[idx];

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: ring ? `0 0 0 1.5px ${ring}` : undefined,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
