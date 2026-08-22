import { Check } from 'lucide-react';
import { features, type Domain } from '@content/site';
import { DomainGlow } from '@ui/Aurora';
import { Container } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { PhoneFrame } from '@ui/phone/PhoneFrame';
import {
  BalancesScreen,
  EventsScreen,
  GroupsScreen,
  ProfileScreen,
  VibesScreen,
} from '@ui/phone/screens';

/**
 * Each domain wears the accent of its tab in the native app, so scrolling the
 * page walks you through the product's actual colour system.
 */
const DOMAINS: Record<
  Domain,
  { screen: () => JSX.Element; glow: string; accent: string; tint: string }
> = {
  events: { screen: EventsScreen, glow: '#C7F04A', accent: 'text-events', tint: 'bg-events-tint' },
  split: { screen: BalancesScreen, glow: '#4ADE80', accent: 'text-split', tint: 'bg-split-tint' },
  vibes: { screen: VibesScreen, glow: '#FF7A7A', accent: 'text-vibes', tint: 'bg-vibes-tint' },
  groups: { screen: GroupsScreen, glow: '#FF9F45', accent: 'text-groups', tint: 'bg-groups-tint' },
  profile: {
    screen: ProfileScreen,
    glow: '#C9A7FF',
    accent: 'text-profile',
    tint: 'bg-profile-tint',
  },
};

export function FeatureRows() {
  return (
    <div id="features" className="relative">
      {features.map((feature, i) => {
        const domain = DOMAINS[feature.domain];
        const Screen = domain.screen;
        const flipped = i % 2 === 1;

        return (
          <section
            key={feature.id}
            id={feature.id}
            className={`relative isolate overflow-hidden py-20 sm:py-24 ${
              i % 2 === 1 ? 'bg-bg-elev' : ''
            }`}
          >
            <DomainGlow color={domain.glow} side={flipped ? 'left' : 'right'} />

            <Container>
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                {/* Copy */}
                <Reveal className={flipped ? 'lg:order-2' : ''}>
                  <div className="max-w-lg">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full ${domain.tint} px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.14em] ${domain.accent}`}
                    >
                      {feature.eyebrow}
                      <span className="text-ink-faint">·</span>
                      <span className="text-ink-muted">{feature.tab} tab</span>
                    </span>

                    <h2 className="mt-6 text-[2rem] font-bold leading-[1.1] sm:text-[2.5rem]">
                      {feature.headline}
                    </h2>

                    <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">
                      {feature.body}
                    </p>

                    <ul className="mt-7 space-y-3">
                      {feature.points.map((point) => (
                        <li key={point} className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${domain.tint}`}
                          >
                            <Check
                              className={`h-3 w-3 ${domain.accent}`}
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          </span>
                          <span className="text-[0.95rem] text-ink-muted">{point}</span>
                        </li>
                      ))}
                    </ul>

                    <blockquote
                      className={`mt-8 border-l-2 pl-4 text-base font-semibold italic text-ink`}
                      style={{ borderColor: `var(--${feature.domain})` }}
                    >
                      {feature.quote}
                    </blockquote>
                  </div>
                </Reveal>

                {/* Device */}
                <Reveal delay={120} className={flipped ? 'lg:order-1' : ''}>
                  <PhoneFrame
                    className="mx-auto max-w-[300px]"
                    glow={`radial-gradient(circle, ${domain.glow}, transparent 65%)`}
                  >
                    <Screen />
                  </PhoneFrame>
                </Reveal>
              </div>
            </Container>
          </section>
        );
      })}
    </div>
  );
}
