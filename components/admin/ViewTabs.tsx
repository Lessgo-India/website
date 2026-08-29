'use client';

import { useRef } from 'react';

export interface ViewTab {
  id: string;
  label: string;
}

/**
 * Page-level navigation between the windowed overview and the all-time view.
 *
 * Deliberately an underlined tab bar rather than another pill group, so it can't
 * be mistaken for the timeframe picker sitting a few pixels above it.
 */
export default function ViewTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly ViewTab[];
  value: string;
  onChange: (id: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (index: number, step: number) => {
    const next = (index + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Dashboard view" className="flex gap-1 border-b border-line">
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${tab.id}-tab`}
            aria-selected={selected}
            aria-controls={`${tab.id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                move(index, -1);
              } else if (event.key === 'Home') {
                event.preventDefault();
                move(0, 0);
              } else if (event.key === 'End') {
                event.preventDefault();
                move(tabs.length - 1, 0);
              }
            }}
            className={`-mb-px min-h-[44px] border-b-2 px-4 text-sm font-semibold transition-colors ${
              selected
                ? 'border-profile text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
