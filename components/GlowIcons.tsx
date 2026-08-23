import type { CSSProperties } from 'react';

/**
 * Outlined party / hangout / trip icons (lucide line art) scattered at random
 * positions, rotations and sizes across a large tile, used as an *alpha mask*
 * over a `--glow` fill so the colour shows only along the outlines. The scatter
 * is generated from a fixed seed, so it is identical on the server and the
 * client (no hydration mismatch) while looking organic rather than gridded.
 */
const ICON_GLYPHS = [
  '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  '<path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/>',
  '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>',
  '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  '<path d="M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2"/><path d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"/><path d="M10 20h4"/><circle cx="16" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>',
  '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/>',
];

/** Tiny seeded PRNG (mulberry32) — keeps the scatter deterministic across renders. */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Scatter one random icon per grid cell, each jittered off-centre and given a
 * random rotation and scale. Icons stay within their cell so the tile still
 * repeats seamlessly, but the lattice is no longer visible.
 */
function buildTile(): string {
  const cols = 8;
  const rows = 6;
  const cell = 60;
  const rand = seededRandom(20260823);
  let body = '';
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const glyph = ICON_GLYPHS[Math.floor(rand() * ICON_GLYPHS.length)];
      const cx = (c + 0.5) * cell + (rand() - 0.5) * 16;
      const cy = (r + 0.5) * cell + (rand() - 0.5) * 16;
      const rot = Math.round((rand() - 0.5) * 52);
      const scale = (0.7 + rand() * 0.38).toFixed(2);
      body += `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot}) scale(${scale}) translate(-12 -12)">${glyph}</g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}" viewBox="0 0 ${cols * cell} ${rows * cell}" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

const MASK = `url("data:image/svg+xml,${encodeURIComponent(buildTile())}")`;

/**
 * A field of small outlined party / hangout / trip icons filling a glow. The
 * `--glow` colour shows only along the outlines and fades out past the glow
 * radius. Decorative only — hidden from assistive tech, pointer-transparent.
 */
export function GlowIcons({
  at = '50% 50%',
  size = 460,
  opacity = 0.5,
  color = 'var(--glow)',
  className = '',
}: {
  /** Centre of the glow: e.g. '50% 50%' or 'var(--spot-x) var(--spot-y)'. */
  at?: string;
  /** Diameter of the glow (px) governing the icon-field fade. */
  size?: number;
  opacity?: number;
  /** Fill for the icon outlines: a solid colour or a gradient (e.g. `var(--brand-gradient)`). */
  color?: string;
  className?: string;
}) {
  const fade = `radial-gradient(${size}px circle at ${at}, #000 0%, #000 22%, transparent 66%)`;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ opacity, WebkitMaskImage: fade, maskImage: fade } as CSSProperties}
    >
      <div
        className="absolute inset-0"
        style={
          {
            background: color,
            WebkitMaskImage: MASK,
            maskImage: MASK,
            WebkitMaskRepeat: 'repeat',
            maskRepeat: 'repeat',
            WebkitMaskSize: '256px 192px',
            maskSize: '256px 192px',
          } as CSSProperties
        }
      />
    </div>
  );
}
