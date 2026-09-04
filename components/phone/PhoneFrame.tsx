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

        <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[37px]">
          {children}
          {/* Dynamic-island style cutout */}
          <div className="absolute left-1/2 top-[10px] h-[22px] w-[76px] -translate-x-1/2 rounded-full bg-black/90" />
        </div>
      </div>
    </div>
  );
}

/** Status bar row, matched to the screen's ink colour. */
export function StatusBar({ ink }: { ink: string }) {
  return (
    <div
      className="flex items-center justify-between px-5 pb-1 pt-[13px] text-[9px] font-semibold"
      style={{ color: ink }}
    >
      <span>9:41</span>
      <span className="flex items-center gap-[3px]">
        <span className="inline-block h-[6px] w-[6px] rounded-[1px]" style={{ background: ink, opacity: 0.5 }} />
        <span className="inline-block h-[7px] w-[7px] rounded-[1px]" style={{ background: ink, opacity: 0.75 }} />
        <span className="inline-block h-[8px] w-[14px] rounded-[2px] border" style={{ borderColor: ink }} />
      </span>
    </div>
  );
}

const TABS = [
  { id: 'events', label: 'Events', glyph: '◈' },
  { id: 'groups', label: 'Groups', glyph: '◉' },
  { id: 'split', label: 'Split', glyph: '▤' },
  { id: 'vibes', label: 'Vibes', glyph: '✦' },
  { id: 'profile', label: 'You', glyph: '◐' },
] as const;

/** The app's five-tab bar, with the active tab tinted by its domain accent. */
export function TabBar({
  active,
  accent,
  ink,
  surface,
}: {
  active: (typeof TABS)[number]['id'];
  accent: string;
  ink: string;
  surface: string;
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-end justify-around border-t px-2 pb-3 pt-2"
      style={{
        background: surface,
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <div key={tab.id} className="flex flex-1 flex-col items-center gap-[3px]">
            <span
              className="text-[13px] leading-none"
              style={{ color: on ? accent : ink, opacity: on ? 1 : 0.38 }}
            >
              {tab.glyph}
            </span>
            <span
              className="text-[7px] font-semibold tracking-tight"
              style={{ color: on ? accent : ink, opacity: on ? 1 : 0.38 }}
            >
              {tab.label}
            </span>
          </div>
        );
      })}
      <div
        className="absolute bottom-[5px] left-1/2 h-[3px] w-[86px] -translate-x-1/2 rounded-full"
        style={{ background: ink, opacity: 0.22 }}
      />
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
