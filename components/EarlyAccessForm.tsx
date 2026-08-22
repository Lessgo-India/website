'use client';

import { useId, useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from './Button';

type State = 'idle' | 'loading' | 'done' | 'error';

export function EarlyAccessForm({
  compact = false,
  source = 'home',
}: {
  compact?: boolean;
  source?: string;
}) {
  const id = useId();
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === 'loading') return;

    setState('loading');
    setMessage('');

    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data: { ok?: boolean; message?: string } = await res.json();

      if (res.ok && data.ok) {
        setState('done');
        setMessage(data.message ?? "You're on the list. We'll be in touch.");
        setEmail('');
      } else {
        setState('error');
        setMessage(data.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setState('error');
      setMessage('Could not reach us just now. Please try again in a moment.');
    }
  }

  if (state === 'done') {
    return (
      <div
        role="status"
        className={`flex items-center gap-3 rounded-full border border-line bg-surface px-5 py-4 ${
          compact ? '' : 'sm:px-6'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-split-tint">
          <Check className="h-4 w-4 text-split" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-ink">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={`${id}-email`} className="sr-only">
            Email address
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-describedby={`${id}-help`}
            aria-invalid={state === 'error' || undefined}
            className="h-[52px] w-full rounded-full border border-line-strong bg-bg-elev px-6 text-base text-ink placeholder:text-ink-faint focus:border-transparent"
          />
        </div>
        <Button type="submit" size="lg" disabled={state === 'loading'} className="sm:w-auto">
          {state === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Joining…
            </>
          ) : (
            <>
              Get early access
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>

      <p
        id={`${id}-help`}
        className={`mt-3 text-xs ${state === 'error' ? 'text-vibes' : 'text-ink-faint'}`}
        role={state === 'error' ? 'alert' : undefined}
      >
        {state === 'error'
          ? message
          : 'One email when Lessgo opens up. No spam, unsubscribe any time.'}
      </p>
    </form>
  );
}
