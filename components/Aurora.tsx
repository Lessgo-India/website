import { GlowIcons } from '@ui/GlowIcons';

/**
 * A soft ambient glow in the region's theme colour (`--glow`). On the flat
 * black/white canvas it is the only colour behind the content, so each section
 * recolours it just by setting `--glow`. Pure CSS, stays on the compositor.
 *
 * Decorative only — hidden from assistive tech, frozen by prefers-reduced-motion.
 */
export function Aurora({
  className = '',
  intensity = 'full',
}: {
  className?: string;
  intensity?: 'full' | 'soft';
}) {
  const opacity = intensity === 'soft' ? 0.07 : 0.11;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div
        className="absolute left-1/2 top-[-18%] h-[38rem] w-[54rem] -translate-x-1/2 rounded-full blur-[140px] animate-aurora-a"
        style={{
          opacity,
          background: 'radial-gradient(circle at 50% 50%, var(--glow) 0%, transparent 68%)',
        }}
      />
      <GlowIcons at="50% 22%" size={520} opacity={intensity === 'soft' ? 0.16 : 0.24} />
    </div>
  );
}

/** A single theme-tinted glow behind a section. Defaults to the region's `--glow`. */
export function DomainGlow({
  color = 'var(--glow)',
  side = 'right',
}: {
  color?: string;
  side?: 'left' | 'right';
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 -z-10 h-[30rem] w-[30rem] -translate-y-1/2 rounded-full blur-[120px] ${
        side === 'right' ? '-right-[10%]' : '-left-[10%]'
      }`}
      style={{
        background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
        opacity: 0.1,
      }}
    />
  );
}
