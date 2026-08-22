'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  // Rendered as dark on the server; corrected on mount from the DOM attribute
  // the anti-flash script already set, so there is no flash and no mismatch.
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(currentTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private mode or storage disabled — the toggle still works for this visit.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors duration-200 hover:text-ink ${className}`}
    >
      {mounted && theme === 'light' ? (
        <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}
