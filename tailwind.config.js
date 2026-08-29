/** @type {import('tailwindcss').Config} */

// Dark mode is driven by `data-theme="dark"` on <html>, set by the anti-flash
// script in app/layout.tsx before first paint.
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './web/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './content/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // ── Semantic surface/ink tokens (flip with the theme) ──────────────
        bg: 'var(--bg)',
        'bg-elev': 'var(--bg-elev)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        'ink-faint': 'var(--ink-faint)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',

        // ── The five product domains, mirrored from the app's theme.ts ─────
        events: {
          DEFAULT: 'var(--events)',
          fill: 'var(--events-fill)',
          on: 'var(--events-on)',
          tint: 'var(--events-tint)',
        },
        groups: {
          DEFAULT: 'var(--groups)',
          fill: 'var(--groups-fill)',
          on: 'var(--groups-on)',
          tint: 'var(--groups-tint)',
        },
        split: {
          DEFAULT: 'var(--split)',
          fill: 'var(--split-fill)',
          on: 'var(--split-on)',
          tint: 'var(--split-tint)',
        },
        vibes: {
          DEFAULT: 'var(--vibes)',
          fill: 'var(--vibes-fill)',
          on: 'var(--vibes-on)',
          tint: 'var(--vibes-tint)',
        },
        profile: {
          DEFAULT: 'var(--profile)',
          fill: 'var(--profile-fill)',
          on: 'var(--profile-on)',
          tint: 'var(--profile-tint)',
        },

        // ── Service status, used only by the admin dashboard ───────────────
        ok: { DEFAULT: 'var(--ok)', tint: 'var(--ok-tint)' },
        warn: { DEFAULT: 'var(--warn)', tint: 'var(--warn-tint)' },
        down: { DEFAULT: 'var(--down)', tint: 'var(--down-tint)' },

        // ── Gold, used only by the all-time totals card ────────────────────
        gold: {
          DEFAULT: 'var(--gold)',
          line: 'var(--gold-line)',
          tint: 'var(--gold-tint)',
          glow: 'var(--gold-glow)',
        },

        // ── Fixed brand stops for the signature aurora gradient ────────────
        brand: {
          teal: '#22D3C5',
          blue: '#4776E6',
          purple: '#8E54E9',
          magenta: '#EC008C',
          night: '#0E0B24',
          dusk: '#1B1547',
          mist: '#F1EEFF',
        },
      },
      borderRadius: {
        // Mirrors the app's radius scale (constants/theme.ts)
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
        '2xl': '32px',
        '3xl': '40px',
      },
      maxWidth: {
        prose: '68ch',
        container: '1200px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(9, 6, 26, 0.04), 0 8px 24px -12px rgba(9, 6, 26, 0.18)',
        lift: '0 2px 4px rgba(9, 6, 26, 0.06), 0 18px 40px -18px rgba(9, 6, 26, 0.28)',
        pop: '0 24px 60px -24px rgba(9, 6, 26, 0.42)',
        phone: '0 40px 90px -40px rgba(9, 6, 26, 0.65)',
      },
      keyframes: {
        'aurora-a': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(6%, -8%, 0) scale(1.18)' },
        },
        'aurora-b': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1.1)' },
          '50%': { transform: 'translate3d(-8%, 6%, 0) scale(0.92)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '70%, 100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        'gold-sweep': {
          '0%, 55%': { transform: 'translateX(-200%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
      animation: {
        'aurora-a': 'aurora-a 22s cubic-bezier(0.45,0,0.55,1) infinite',
        'aurora-b': 'aurora-b 28s cubic-bezier(0.45,0,0.55,1) infinite',
        float: 'float 6s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.24,0,0.38,1) infinite',
        'gold-sweep': 'gold-sweep 6s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
