'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

import { GlowIcons } from '@ui/GlowIcons';

/**
 * A soft radial glow that tracks the pointer across its nearest positioned
 * ancestor — the "spotlight" effect. Drop it into any `relative isolate`
 * section (alongside <Aurora/>) and the section lights up under the cursor.
 *
 * Decorative only: hidden from assistive tech, pointer-transparent, and inert
 * on touch devices (no fine pointer) and under prefers-reduced-motion. The
 * pointer position is written to CSS variables inside a rAF frame, so a
 * `radial-gradient` does the painting on the compositor — no React re-renders.
 */
export function Spotlight({
  color = 'var(--brand-gradient)',
  size = 480,
  className = '',
}: {
  color?: string;
  /** Diameter of the glow, in px. */
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;

    // Only a real mouse gets the effect; skip touch and reduced-motion users.
    if (
      !window.matchMedia('(pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let frame = 0;
    let rect = host.getBoundingClientRect();
    let x = 0;
    let y = 0;

    const measure = () => {
      rect = host.getBoundingClientRect();
    };

    const paint = () => {
      frame = 0;
      el.style.setProperty('--spot-x', `${x - rect.left}px`);
      el.style.setProperty('--spot-y', `${y - rect.top}px`);
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.style.setProperty('--spot-opacity', '1');
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onLeave = () => {
      el.style.setProperty('--spot-opacity', '0');
    };

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      style={{
        opacity: 'var(--spot-opacity, 0)',
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        className="absolute inset-0"
        style={
          {
            opacity: 0.38,
            background: color,
            WebkitMaskImage: `radial-gradient(${size}px circle at var(--spot-x, 50%) var(--spot-y, 50%), #000 0%, transparent 68%)`,
            maskImage: `radial-gradient(${size}px circle at var(--spot-x, 50%) var(--spot-y, 50%), #000 0%, transparent 68%)`,
          } as CSSProperties
        }
      />
      <GlowIcons at="var(--spot-x, 50%) var(--spot-y, 50%)" size={size} color={color} opacity={0.46} />
    </div>
  );
}
