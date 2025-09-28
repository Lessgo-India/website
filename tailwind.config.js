/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'sans-serif'],
        display: ['SF Pro Display', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        'luma-purple': '#6366f1',
        'luma-purple-hover': '#4f46e5',
        'luma-light-purple': '#8b5cf6',
        'luma-green': '#10b981',
        'luma-orange': '#f59e0b',
        
        'surface-primary': '#FFFFFF',
        'surface-secondary': '#f8fafc',
        'surface-elevated': '#FFFFFF',
        
        'text-primary': '#0f172a',
        'text-secondary': '#64748b',
        'text-tertiary': '#94a3b8',
        
        'border-primary': '#e2e8f0',
        'border-secondary': '#cbd5e1',
        
        'bg-primary': '#FFFFFF',
        'bg-secondary': '#f8fafc',
        'bg-tertiary': '#f1f5f9',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'slide-in': 'slideIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'scale-in-glass': 'scaleInGlass 0.8s ease-out forwards',
        'slide-in-glass': 'slideInGlass 0.7s ease-out forwards',
        'ethereal-float': 'etherealFloat 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'morph-bg': 'morphBackground 8s ease-in-out infinite',
        'slide-in-left': 'slideInFromLeft 0.6s ease-out forwards',
        'fade-in-delay-1': 'fadeInUp 0.6s ease-out 0.1s forwards',
        'fade-in-delay-2': 'fadeInUp 0.6s ease-out 0.2s forwards',
        'fade-in-delay-3': 'fadeInUp 0.6s ease-out 0.3s forwards',
        'fade-in-delay-4': 'fadeInUp 0.6s ease-out 0.4s forwards',
        'fade-in-delay-5': 'fadeInUp 0.6s ease-out 0.5s forwards',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      transitionProperty: {
        'glass': 'all, backdrop-filter, -webkit-backdrop-filter',
      },
      spacing: {
        '18': '4.5rem', /* 72px */
        '72': '18rem',   /* 288px */
        '84': '21rem',   /* 336px */
        '96': '24rem',   /* 384px */
      }
    },
  },
  plugins: [],
};
