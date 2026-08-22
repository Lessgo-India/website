import type { Metadata } from 'next';
import { Bell, Rocket, Smartphone } from 'lucide-react';
import { SITE_URL } from '@web/lib/config';
import { Container, Section } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { PageHeader } from '@ui/PageHeader';
import { EarlyAccessForm } from '@ui/EarlyAccessForm';
import { StoreBadges } from '@ui/StoreBadges';
import { JsonLd, appSchema, breadcrumbSchema } from '@ui/JsonLd';
import { PhoneFrame } from '@ui/phone/PhoneFrame';
import { EventDetailScreen } from '@ui/phone/screens';

const url = SITE_URL || 'https://lessgo.com';

export const metadata: Metadata = {
  title: 'Get Lessgo — early access',
  description:
    'Lessgo is in early access on Android, with iOS right behind. Join the list and we will send you the download the moment it opens up.',
  alternates: { canonical: '/download' },
};

const NEXT_STEPS = [
  {
    icon: Bell,
    title: 'We email you once',
    body: 'One message the day your platform opens up. No drip campaign, no newsletter you did not ask for.',
  },
  {
    icon: Smartphone,
    title: 'Install and verify',
    body: 'Sign in with your phone number and a six-digit code. No password to forget.',
  },
  {
    icon: Rocket,
    title: 'Start your first plan',
    body: 'Pick a vibe, invite your people, and see who is in. It takes about a minute.',
  },
];

export default function DownloadPage() {
  return (
    <>
      <JsonLd data={appSchema(url)} />
      <JsonLd
        data={breadcrumbSchema(url, [
          { name: 'Home', path: '/' },
          { name: 'Get the app', path: '/download' },
        ])}
      />

      <PageHeader
        eyebrow="Early access"
        title={
          <>
            Be first in when <span className="text-gradient">Lessgo opens up</span>.
          </>
        }
        body="Lessgo is in early access on Android right now, with iOS right behind. Leave your email and we will send you the download the moment your platform is ready."
      >
        <div className="max-w-lg">
          <EarlyAccessForm source="download-page" />
        </div>
        <div className="mt-8">
          <StoreBadges />
        </div>
      </PageHeader>

      <Section tone="raised">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_auto] lg:gap-20">
            <div>
              <h2 className="text-[1.75rem] font-bold sm:text-[2.15rem]">What happens next</h2>
              <ol className="mt-9 space-y-8">
                {NEXT_STEPS.map(({ icon: Icon, title, body }, i) => (
                  <Reveal as="li" key={title} delay={i * 90} className="flex gap-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-profile-tint">
                      <Icon className="h-5 w-5 text-profile" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold">{title}</h3>
                      <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
                        {body}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </ol>

              <dl className="mt-12 grid max-w-md grid-cols-2 gap-4">
                <div className="rounded-2xl border border-line bg-surface px-5 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Platforms
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">Android &amp; iOS</dd>
                </div>
                <div className="rounded-2xl border border-line bg-surface px-5 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Price
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">Free to start</dd>
                </div>
                <div className="rounded-2xl border border-line bg-surface px-5 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Sign in
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">Phone &amp; OTP</dd>
                </div>
                <div className="rounded-2xl border border-line bg-surface px-5 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Minimum age
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">13+</dd>
                </div>
              </dl>
            </div>

            <Reveal delay={120}>
              <PhoneFrame
                float
                className="mx-auto w-[260px] sm:w-[300px]"
                glow="radial-gradient(circle, #8E54E9, transparent 65%)"
              >
                <EventDetailScreen />
              </PhoneFrame>
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  );
}
