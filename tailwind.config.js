/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      colors: {
        'primary-accent': 'var(--primary-accent)',
        'primary-accent-hover': 'var(--primary-accent-hover)',
        'secondary-accent': 'var(--secondary-accent)',
        'secondary-accent-hover': 'var(--secondary-accent-hover)',
        'text-on-primary': 'var(--text-on-primary)',
        'text-on-secondary': 'var(--text-on-secondary)',

        'bg-light-primary': 'var(--bg-light-primary)',
        'bg-light-secondary': 'var(--bg-light-secondary)',
        'text-light-primary': 'var(--text-light-primary)',
        'text-light-secondary': 'var(--text-light-secondary)',
        'border-light': 'var(--border-light)',

        'bg-dark-primary': 'var(--bg-dark-primary)',
        'bg-dark-secondary': 'var(--bg-dark-secondary)',
        'text-dark-primary': 'var(--text-dark-primary)',
        'text-dark-secondary': 'var(--text-dark-secondary)',
        'border-dark': 'var(--border-dark)',
      },
      animation: {
        'slide-in-left-fast': 'slideInFromLeft 0.5s ease-out forwards',
        'slide-in-left-medium': 'slideInFromLeft 0.7s ease-out forwards',
        'slide-in-left-slow': 'slideInFromLeft 0.9s ease-out forwards',
        'slide-in-bottom-buttons': 'slideInFromBottom 0.5s ease-out 1s forwards',
        'fade-in-medium': 'fadeIn 0.7s ease-out forwards',
        'scale-up-fade-in': 'scaleUpFadeIn 0.5s ease-out forwards',
        'scale-up-fade-in-delayed': 'scaleUpFadeIn 0.5s ease-out 0.5s forwards',
        'fade-in-delay-0s': 'fadeIn 0.7s ease-out 0s forwards',
        'fade-in-delay-0_2s': 'fadeIn 0.7s ease-out 0.2s forwards',
        'fade-in-delay-0_4s': 'fadeIn 0.7s ease-out 0.4s forwards',
        'fade-in-delay-0_6s': 'fadeIn 0.7s ease-out 0.6s forwards',
        'fade-in-delay-0_8s': 'fadeIn 0.7s ease-out 0.8s forwards',
        'fade-in-delay-1s': 'fadeIn 0.7s ease-out 1s forwards',
        'slide-in-top': 'slideInFromTop 0.5s ease-out forwards',
        'scale-up-fade-in-card': 'scaleUpFadeIn 0.4s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
      },
      transitionProperty: {
        'DEFAULT': 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
      }
    },
  },
  plugins: [],
};
