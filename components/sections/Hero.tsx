import { ArrowRight, Check } from 'lucide-react';
import { hero } from '@content/site';
import { Aurora } from '@ui/Aurora';
import { Spotlight } from '@ui/Spotlight';
import { ButtonLink } from '@ui/Button';
import { CtaButton } from '@ui/CtaButton';
import { Container } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { PhoneFrame } from '@ui/phone/PhoneFrame';
import { BalancesScreen, EventsScreen } from '@ui/phone/screens';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-20 pt-12 sm:pb-28 sm:pt-16">
      <Aurora />
      <Spotlight />

      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
          {/* ── Copy ─────────────────────────────────────────────────────── */}
          <div className="max-w-xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-ink-muted backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-events animate-pulse-ring" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-events" />
                </span>
                {hero.eyebrow}
              </span>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[1.02] sm:text-[3.5rem] lg:text-[4rem]">
                {hero.headlineLead}
                <br />
                <span className="text-gradient">{hero.headlineAccent}</span>
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
                {hero.subhead}
              </p>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <CtaButton href="/download" size="lg" location="hero">
                  {hero.primaryCta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </CtaButton>
                <ButtonLink href="/#how-it-works" variant="secondary" size="lg">
                  {hero.secondaryCta}
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5">
                {hero.trust.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-sm text-ink-muted">
                    <Check className="h-4 w-4 shrink-0 text-split" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* ── Device cluster ───────────────────────────────────────────── */}
          <Reveal delay={200} className="relative">
            <div className="relative mx-auto flex max-w-[420px] items-center justify-center">
              {/* Secondary device, desktop only so mobile stays light */}
              <div className="absolute -left-2 top-10 hidden w-[62%] -rotate-[9deg] opacity-90 lg:block">
                <PhoneFrame glow="radial-gradient(circle, #4ADE80, transparent 65%)">
                  <BalancesScreen />
                </PhoneFrame>
              </div>

              <div className="relative z-10 w-[78%] translate-x-0 sm:w-[72%] lg:ml-24 lg:w-[86%]">
                <PhoneFrame float glow="radial-gradient(circle, #8E54E9, transparent 65%)">
                  <EventsScreen />
                </PhoneFrame>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
