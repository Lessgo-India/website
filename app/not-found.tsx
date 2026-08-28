import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarOff,
  CircleHelp,
  Download,
  House,
  Link2Off,
  MapPinOff,
  SearchX,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { notFound as copy } from '@content/site';
import { Aurora } from '@ui/Aurora';
import { ButtonLink } from '@ui/Button';
import { NotFoundTracker } from '@ui/NotFoundTracker';
import { Reveal } from '@ui/Reveal';
import { Container, Section } from '@ui/Section';
import { SiteFooter } from '@ui/SiteFooter';
import { SiteHeader } from '@ui/SiteHeader';
import { Spotlight } from '@ui/Spotlight';

export const metadata: Metadata = {
  title: 'Page not found',
  description:
    'That page doesn’t exist. Head back to Lessgo, or find what you were looking for.',
  // Without this the root layout's `index, follow` is inherited and contradicts
  // the noindex Next emits for this route.
  robots: { index: false, follow: true },
};

const DESTINATION_ICONS: Record<string, LucideIcon> = {
  home: House,
  features: Sparkles,
  help: CircleHelp,
  download: Download,
};

export default function NotFound() {
  return (
    <>
      <NotFoundTracker />
      <SiteHeader />

      <main id="content">
        <section className="relative isolate overflow-hidden pb-16 pt-14 sm:pb-24 sm:pt-20">
          <Aurora />
          <Spotlight />

          <Container className="relative">
            <div className="grid items-center gap-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
              {/* ── Copy ───────────────────────────────────────────────── */}
              <div className="max-w-xl">
                <Reveal>
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-ink-faint backdrop-blur">
                    <Link2Off className="h-3.5 w-3.5" aria-hidden="true" />
                    {copy.eyebrow}
                  </span>
                </Reveal>

                <Reveal delay={60}>
                  <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[1.02] sm:text-[3.5rem]">
                    {copy.headlineLead}{' '}
                    <span className="text-gradient">{copy.headlineAccent}</span>.
                  </h1>
                </Reveal>

                <Reveal delay={120}>
                  <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
                    {copy.body}
                  </p>
                </Reveal>

                <Reveal delay={180}>
                  <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <ButtonLink href="/" size="lg">
                      {copy.primaryCta}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </ButtonLink>
                    <ButtonLink href="/help" variant="secondary" size="lg">
                      {copy.secondaryCta}
                    </ButtonLink>
                  </div>
                </Reveal>

                <Reveal delay={240}>
                  <div className="mt-10 max-w-lg rounded-lg border border-line bg-surface p-5">
                    <p className="font-display text-sm font-bold">{copy.invite.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {copy.invite.body}
                    </p>
                  </div>
                </Reveal>
              </div>

              {/* ── The plan nobody came to (decorative) ────────────────── */}
              <Reveal delay={200}>
                <div aria-hidden="true" className="relative mx-auto max-w-[380px] select-none">
                  <span className="text-gradient pointer-events-none absolute inset-x-0 -top-8 text-center font-display text-[9rem] font-extrabold leading-none tracking-tighter opacity-20 lg:-top-16 lg:text-[11rem]">
                    404
                  </span>

                  <div className="relative -rotate-[2.5deg]">
                    <div className="animate-float">
                      <div className="card overflow-hidden shadow-pop">
                        <div className="relative h-32 border-b border-line sm:h-36">
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{ background: 'var(--brand-gradient)' }}
                          />
                          <div className="absolute inset-0 grid place-items-center">
                            <SearchX className="h-9 w-9 text-ink-faint" />
                          </div>
                          <span className="absolute left-4 top-4 rounded-full bg-events-tint px-2.5 py-1 text-[0.7rem] font-semibold text-events">
                            {copy.card.chip}
                          </span>
                        </div>

                        <div className="p-5">
                          <p className="font-display text-lg font-bold text-ink-faint line-through decoration-vibes decoration-2">
                            {copy.card.title}
                          </p>

                          <div className="mt-3 space-y-2 text-sm text-ink-faint">
                            <p className="flex items-center gap-2">
                              <CalendarOff className="h-4 w-4 shrink-0" />
                              {copy.card.when}
                            </p>
                            <p className="flex items-center gap-2">
                              <MapPinOff className="h-4 w-4 shrink-0" />
                              {copy.card.where}
                            </p>
                          </div>

                          <div className="mt-5 grid grid-cols-3 gap-2">
                            {copy.card.rsvp.map((option) => (
                              <div
                                key={option.label}
                                className="rounded-md border border-line bg-surface-2 py-2 text-center"
                              >
                                <p className="font-display text-base font-bold text-ink-faint">
                                  {option.count}
                                </p>
                                <p className="mt-0.5 text-[0.7rem] font-medium text-ink-faint">
                                  {option.label}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* ── Somewhere to actually go ──────────────────────────────────── */}
        <Section tone="raised" className="border-t border-line">
          <Container>
            <Reveal>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
                {copy.destinationsTitle}
              </h2>
            </Reveal>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {copy.destinations.map((destination, i) => {
                const Icon = DESTINATION_ICONS[destination.icon];
                return (
                  <li key={destination.href} className="h-full">
                    <Reveal delay={i * 60} className="h-full">
                      <Link
                        href={destination.href}
                        className="group relative flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-1 hover:border-line-strong"
                      >
                        <span
                          aria-hidden="true"
                          className="gradient-ring pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        />
                        <span className="flex items-start justify-between">
                          <Icon
                            className="h-5 w-5 text-ink-faint transition-colors duration-200 group-hover:text-ink"
                            aria-hidden="true"
                          />
                          <ArrowRight
                            className="h-4 w-4 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="mt-5 font-display text-base font-bold">
                          {destination.label}
                        </span>
                        <span className="mt-1.5 text-sm text-ink-muted">{destination.body}</span>
                      </Link>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
