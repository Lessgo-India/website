import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarPlus,
  Check,
  IndianRupee,
  ScanLine,
  Sparkles,
  Target,
  TicketCheck,
} from 'lucide-react';
import { partnerSite } from '@content/partner';
import { Aurora } from '@ui/Aurora';
import { Reveal } from '@ui/Reveal';
import { Spotlight } from '@ui/Spotlight';
import { ThemeToggle } from '@ui/ThemeToggle';
import { AppScreenshot } from '@ui/phone/AppScreenshot';
import { PhoneFrame } from '@ui/phone/PhoneFrame';
import { PortalMark, primaryButtonClass, secondaryButtonClass } from './ui';

const METRICS = [
  { label: 'Story views', value: '18.4K', icon: Sparkles, color: 'var(--vibes)' },
  { label: 'Offers claimed', value: '1,268', icon: TicketCheck, color: 'var(--events)' },
  { label: 'Group visits', value: '342', icon: CalendarPlus, color: '#22d3c5' },
  { label: 'Sales via Lessgo', value: '₹8.7L', icon: IndianRupee, color: 'var(--profile)' },
] as const;

export default function PartnerLaunch() {
  return (
    <div className="min-h-screen min-h-dvh bg-bg text-ink">
      <header className="partner-public-header sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="container-page flex min-h-20 items-center justify-between gap-4">
          <Link href="/partner" aria-label="Lessgo Partners home">
            <PortalMark />
          </Link>
          <nav className="flex items-center gap-2" aria-label="Partner navigation">
            <a href="#how-it-works" className="hidden min-h-11 items-center px-3 text-sm font-semibold text-ink-muted hover:text-ink md:inline-flex">
              How it works
            </a>
            <a href="#channels" className="hidden min-h-11 items-center px-3 text-sm font-semibold text-ink-muted hover:text-ink md:inline-flex">
              Channels
            </a>
            <ThemeToggle className="rounded-md" />
            <Link href="/partner/login" className={`${secondaryButtonClass} hidden sm:inline-flex`}>
              Partner login
            </Link>
            <Link href="/partner/signup" className={primaryButtonClass}>
              Apply
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden pb-10 pt-16 sm:pb-16 sm:pt-20">
          <Aurora />
          <Spotlight />
          <div className="container-page relative">
            <div className="mx-auto max-w-4xl text-center">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-events" aria-hidden="true" />
                  {partnerSite.hero.eyebrow}
                </span>
              </Reveal>
              <Reveal delay={60}>
                <h1 className="mt-6 font-display text-[2.8rem] font-extrabold leading-[1.02] sm:text-[4.5rem]">
                  Bring groups
                  <span className="text-gradient block">to your business.</span>
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
                  {partnerSite.hero.body}
                </p>
              </Reveal>
              <Reveal delay={180} className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/partner/signup" className={primaryButtonClass}>
                  Apply to partner
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/partner/login" className={secondaryButtonClass}>
                  Sign in to portal
                </Link>
              </Reveal>
              <Reveal delay={220}>
                <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2">
                  {partnerSite.hero.trust.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-xs text-ink-muted sm:text-sm">
                      <Check className="h-4 w-4 text-events" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal delay={240} className="mt-14">
              <PortalDashboardPreview />
            </Reveal>
          </div>
        </section>

        <section className="py-20 sm:py-28" aria-labelledby="partner-outcomes">
          <div className="container-page">
            <SectionIntro
              eyebrow="Why Lessgo Partners"
              title="Measure plans, not just clicks."
              body="The portal follows the whole journey from a relevant offer to a group that actually redeemed it."
              id="partner-outcomes"
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {partnerSite.outcomes.map((item, index) => (
                <Reveal key={item.title} delay={index * 70}>
                  <article className="h-full rounded-lg border border-line bg-surface p-6">
                    <span className="font-mono text-sm font-bold text-[#22d3c5]">0{index + 1}</span>
                    <h3 className="mt-7 font-display text-xl font-bold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface py-20 sm:py-28" aria-labelledby="vibes-placement">
          <div className="container-page grid items-center gap-14 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#22d3c5]">Where offers meet intent</span>
              <h2 id="vibes-placement" className="mt-4 max-w-xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">
                Your offer lives where people decide what to do.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted">
                Lessgo places partner stories in the Vibes tray, beside the plans people are already making. A claim can become an event, a group visit and a verified redemption.
              </p>
              <ul className="mt-7 space-y-4">
                {[
                  [Target, 'Audience controls by age, gender, state and district'],
                  [Sparkles, 'Campaign creative built for story-style discovery'],
                  [ScanLine, 'One redemption trail across counter, checkout and bookings'],
                ].map(([Icon, copy]) => {
                  const FeatureIcon = Icon as typeof Target;
                  return (
                    <li key={String(copy)} className="flex items-center gap-3 text-sm text-ink">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-profile-tint text-profile">
                        <FeatureIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {copy as string}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="relative mx-auto w-full max-w-[340px]">
              <PhoneFrame float glow="radial-gradient(circle, #8E54E9, transparent 65%)">
                <AppScreenshot name="vibes" eager />
              </PhoneFrame>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-28" aria-labelledby="partner-process">
          <div className="container-page">
            <SectionIntro
              eyebrow="From application to campaign"
              title="A reviewed path to going live."
              body="Every partner is reviewed before Lessgo creates an account or puts an offer in front of users."
              id="partner-process"
            />
            <ol className="mx-auto mt-12 grid max-w-3xl gap-3">
              {partnerSite.process.map((item, index) => (
                <li key={item.title} className="flex gap-4 rounded-lg bg-surface-2 p-5 sm:p-6">
                  <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#22d3c5] font-display font-bold text-black">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-display text-lg font-bold text-ink">{item.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{item.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="channels" className="scroll-mt-24 border-y border-line bg-surface py-20 sm:py-28" aria-labelledby="partner-channels">
          <div className="container-page">
            <SectionIntro
              eyebrow="One portal, three paths"
              title="Fit the way your business sells."
              body="Start with one redemption channel and add another when the operation is ready."
              id="partner-channels"
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {partnerSite.channels.map((channel) => (
                <article key={channel.key} className="rounded-lg border border-line bg-surface-2 p-6">
                  <span className="block h-1.5 w-14 rounded-full" style={{ backgroundColor: channel.color }} aria-hidden="true" />
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.13em] text-ink-muted">{channel.eyebrow}</p>
                  <h3 className="mt-2 font-display text-2xl font-bold">{channel.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{channel.body}</p>
                  <span className="mt-6 inline-flex rounded-full bg-bg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                    {channel.foot}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden py-24 text-center sm:py-32">
          <Aurora />
          <div className="container-page relative">
            <BadgeCheck className="mx-auto h-9 w-9 text-[#22d3c5]" aria-hidden="true" />
            <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold sm:text-5xl">
              Ready to turn an offer into a plan?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted">
              Apply with your business details. The Lessgo team reviews every application before an account is issued.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/partner/signup" className={primaryButtonClass}>
                Start application
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/partner/login" className={secondaryButtonClass}>
                Already a partner? Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
          <PortalMark />
          <p>© {new Date().getFullYear()} Lessgo India · hello@lessgo.in</p>
        </div>
      </footer>
    </div>
  );
}

function SectionIntro({ eyebrow, title, body, id }: { eyebrow: string; title: string; body: string; id: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#22d3c5]">{eyebrow}</p>
      <h2 id={id} className="mt-4 font-display text-3xl font-extrabold sm:text-5xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">{body}</p>
    </div>
  );
}

function PortalDashboardPreview() {
  const bars = [38, 54, 45, 67, 50, 76, 62, 94, 75, 112, 98, 126];
  return (
    <div className="mx-auto max-w-6xl rounded-lg border border-line bg-surface p-4 shadow-[0_20px_80px_rgba(34,211,197,0.10)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#22d3c5]">Good evening, Riya</p>
          <p className="font-display text-xl font-extrabold">Brew Bros</p>
        </div>
        <span className={`${primaryButtonClass} pointer-events-none`}>New campaign</span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-md bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
              {label}
              <Icon className="h-4 w-4" style={{ color }} aria-hidden="true" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="hidden min-h-56 rounded-lg bg-surface-2 p-5 sm:block">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display font-bold">Claims and redemptions</h3>
            <span className="text-xs text-ink-muted">Last 14 days</span>
          </div>
          <div className="mt-7 flex h-36 items-end gap-2 sm:gap-3">
            {bars.map((height, index) => (
              <span
                key={`${height}-${index}`}
                className={`min-w-0 flex-1 rounded-t-sm ${index > 8 ? 'bg-[#22d3c5]' : 'bg-line-strong'}`}
                style={{ height }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-surface-2 p-5">
          <h3 className="font-display font-bold">Your campaigns</h3>
          <ul className="mt-3 divide-y divide-line">
            {[
              ['Friday table for four', '₹400 OFF', 'Live', 'bg-events'],
              ['Make movie night happen', '20% OFF', 'Review', 'bg-groups'],
              ['Weekend escape', '₹800 OFF', 'Scheduled', 'bg-profile'],
            ].map(([title, offer, status, color]) => (
              <li key={title} className="flex items-center gap-3 py-3">
                <span className={`h-10 w-8 flex-none rounded-sm ${color}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{title}</span>
                  <span className="text-[11px] text-ink-muted">{offer}</span>
                </span>
                <span className="rounded-full border border-line px-2 py-1 text-[9px] uppercase text-ink-muted">{status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
