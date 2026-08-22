import type { Metadata } from 'next';
import { changelog } from '@content/site';
import { SITE_URL } from '@web/lib/config';
import { Container, Section } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { PageHeader } from '@ui/PageHeader';
import { JsonLd, breadcrumbSchema } from '@ui/JsonLd';
import { FinalCta } from '@ui/sections/FinalCta';

const url = SITE_URL || 'https://lessgo.com';

export const metadata: Metadata = {
  title: 'What’s new',
  description:
    'Release notes for the Lessgo app — Vibes, balances, shareable event links, groups and Buzz.',
  alternates: { canonical: '/whats-new' },
};

const monthFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function WhatsNewPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema(url, [
          { name: 'Home', path: '/' },
          { name: 'What’s new', path: '/whats-new' },
        ])}
      />

      <PageHeader
        eyebrow="Release notes"
        title={
          <>
            What&apos;s <span className="text-gradient">new</span>.
          </>
        }
        body="Lessgo ships small and often. Here is what has landed recently."
      />

      <Section className="!pt-0">
        <Container>
          <ol className="relative max-w-3xl border-l border-line pl-8 sm:pl-10">
            {changelog.map((release, i) => (
              <Reveal as="li" key={release.version} delay={i * 70} className="relative pb-12 last:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute -left-[41px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg gradient-brand sm:-left-[49px]"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold">{release.title}</h2>
                  <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-xs text-ink-muted">
                    v{release.version}
                  </span>
                </div>
                <time
                  dateTime={release.date}
                  className="mt-1.5 block text-sm text-ink-faint"
                >
                  {monthFormatter.format(new Date(`${release.date}-01T00:00:00Z`))}
                </time>
                <ul className="mt-4 space-y-2">
                  {release.notes.map((note) => (
                    <li key={note} className="flex gap-3 text-[0.95rem] text-ink-muted">
                      <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                      {note}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
