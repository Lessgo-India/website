'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { track } from '@ui/analytics';

type FaqItem = {
  q: string;
  a: string;
  link?: { label: string; href: string };
};

/**
 * Native <details>/<summary> so the FAQ is keyboard-operable, screen-reader
 * friendly and fully functional without JavaScript. The client boundary exists
 * only to report opens to analytics.
 */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-[28px] border border-line bg-surface">
      {items.map((item) => (
        <details
          key={item.q}
          className="group"
          onToggle={(e) => {
            if ((e.currentTarget as HTMLDetailsElement).open) {
              track('faq_opened', { question: item.q });
            }
          }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-ink transition-colors duration-200 hover:bg-surface-2 sm:text-lg [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-transform duration-300 ease-spring group-open:rotate-45">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
          </summary>
          <div className="px-6 pb-6 pr-14 text-[0.95rem] leading-relaxed text-ink-muted">
            <p>{item.a}</p>
            {item.link ? (
              <Link
                href={item.link.href}
                className="mt-3 inline-flex min-h-[40px] items-center font-semibold text-ink underline underline-offset-4 hover:text-profile"
              >
                {item.link.label}
              </Link>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
