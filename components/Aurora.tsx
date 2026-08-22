/**
 * The signature ambient background: two large blurred colour fields that drift
 * slowly behind the hero and the closing CTA. Pure CSS transforms, so it stays
 * on the compositor and never touches layout.
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
  const scale = intensity === 'soft' ? 'opacity-60' : '';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div
        className={`absolute -left-[18%] -top-[30%] h-[42rem] w-[42rem] rounded-full blur-[110px] animate-aurora-a ${scale}`}
        style={{
          opacity: 'var(--aurora-opacity)',
          background:
            'radial-gradient(circle at 30% 30%, #22D3C5 0%, rgba(71,118,230,0.65) 42%, transparent 70%)',
        }}
      />
      <div
        className={`absolute -right-[16%] top-[-14%] h-[38rem] w-[38rem] rounded-full blur-[120px] animate-aurora-b ${scale}`}
        style={{
          opacity: 'var(--aurora-opacity)',
          background:
            'radial-gradient(circle at 60% 40%, #EC008C 0%, rgba(142,84,233,0.7) 45%, transparent 72%)',
        }}
      />
      <div
        className={`absolute bottom-[-28%] left-[24%] h-[34rem] w-[34rem] rounded-full blur-[130px] animate-aurora-a ${scale}`}
        style={{
          opacity: 'calc(var(--aurora-opacity) * 0.7)',
          animationDelay: '-8s',
          background:
            'radial-gradient(circle at 50% 50%, #8E54E9 0%, rgba(34,211,197,0.5) 50%, transparent 74%)',
        }}
      />
      {/* Softens the whole field into the page background. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, transparent 30%, var(--bg) 100%)',
        }}
      />
    </div>
  );
}

/** A single accent-tinted glow, used behind each feature section. */
export function DomainGlow({
  color,
  side = 'right',
}: {
  color: string;
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
        opacity: 0.16,
      }}
    />
  );
}
