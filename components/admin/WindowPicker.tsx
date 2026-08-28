'use client';

import { useRef } from 'react';
import { WINDOW_OPTIONS, type WindowDays } from '@web/lib/adminFormat';

/**
 * The single timeframe control for the whole dashboard.
 *
 * One shared window means every card agrees about "now" and the page costs one
 * round of queries rather than one per card.
 *
 * Implemented as a real radiogroup with a roving tabstop, so the selected state
 * is exposed to assistive tech instead of being implied by a background colour.
 */
export default function WindowPicker({
  value,
  onChange,
  disabled,
}: {
  value: WindowDays;
  onChange: (days: WindowDays) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (index: number, step: number) => {
    const next = (index + step + WINDOW_OPTIONS.length) % WINDOW_OPTIONS.length;
    onChange(WINDOW_OPTIONS[next].days);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Timeframe"
      className="inline-flex rounded-full border border-line bg-surface p-1"
    >
      {WINDOW_OPTIONS.map((option, index) => {
        const selected = option.days === value;
        return (
          <button
            key={option.days}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.description}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.days)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={`min-h-[44px] min-w-[56px] rounded-full px-4 text-sm font-semibold transition-colors ${
              selected
                ? 'bg-profile-tint text-profile'
                : 'text-ink-muted hover:text-ink disabled:opacity-50'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
