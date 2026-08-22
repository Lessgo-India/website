import type { Metadata } from 'next';
import Link from 'next/link';
import { Bug, Mail, ShieldCheck } from 'lucide-react';
import { faq } from '@content/site';
import { SITE_URL } from '@web/lib/config';
import { Container, Section } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { PageHeader } from '@ui/PageHeader';
import { Faq } from '@ui/Faq';
import { JsonLd, breadcrumbSchema, faqSchema } from '@ui/JsonLd';

const url = SITE_URL || 'https://lessgo.com';

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description:
    'Answers about Lessgo — pricing, contacts permission, RSVP without the app, expense splitting, privacy, account deletion and how to reach us.',
  alternates: { canonical: '/help' },
};

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email us',
    body: 'Questions, feedback, or something that went sideways. We read everything.',
    action: 'hello@lessgo.com',
    href: 'mailto:hello@lessgo.com',
  },
  {
    icon: Bug,
    title: 'Report a bug',
    body: 'There is a built-in bug reporter under Profile → Support in the app.',
    action: 'bugs@lessgo.com',
    href: 'mailto:bugs@lessgo.com',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy requests',
    body: 'Access, correct or delete your data, or withdraw consent.',
    action: 'Grievance Officer',
    href: '/privacy#grievance',
  },
];

export default function HelpPage() {
  return (
    <>
      <JsonLd data={faqSchema()} />
      <JsonLd
        data={breadcrumbSchema(url, [
          { name: 'Home', path: '/' },
          { name: 'Help', path: '/help' },
        ])}
      />

      <PageHeader
        eyebrow="Help"
        title={
          <>
            Answers, and a <span className="text-gradient">real human</span> behind them.
          </>
        }
        body="Most things are covered below. If yours is not, write to us — we are a small team and we answer our own email."
      />

      <Section className="!pt-0">
        <Container>
          <Faq items={faq} />
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <h2 className="text-[1.75rem] font-bold sm:text-[2.15rem]">Still stuck?</h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {CHANNELS.map(({ icon: Icon, title, body, action, href }, i) => (
              <Reveal key={title} delay={i * 80}>
                <Link
                  href={href}
                  className="flex h-full flex-col rounded-[28px] border border-line bg-surface p-7 transition-transform duration-300 ease-spring hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-profile-tint">
                    <Icon className="h-5 w-5 text-profile" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2.5 flex-1 text-[0.95rem] leading-relaxed text-ink-muted">
                    {body}
                  </p>
                  <span className="mt-5 text-sm font-semibold text-gradient">{action}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
