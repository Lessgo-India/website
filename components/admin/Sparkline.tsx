'use client';

/**
 * A minimal inline sparkline: one SVG path, no charting dependency.
 *
 * Purely decorative — the value and its definition are always stated in text
 * beside it, so the graphic is hidden from assistive tech.
 */
export default function Sparkline({
  points,
  className = 'text-profile',
}: {
  points: number[];
  className?: string;
}) {
  if (points.length < 2) return null;

  const width = 120;
  const height = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  // A flat series would divide by zero; draw it down the middle instead.
  const span = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / span) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
      className={`overflow-visible ${className}`}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
