import type { Metadata } from 'next';
import { Check, Minus } from 'lucide-react';
import { SITE_URL } from '@web/lib/config';
import { Container, Section, SectionHeading } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { PageHeader } from '@ui/PageHeader';
import { JsonLd, breadcrumbSchema } from '@ui/JsonLd';
import { FeatureRows } from '@ui/sections/FeatureRows';
import { FinalCta } from '@ui/sections/FinalCta';

const url = SITE_URL || 'https://www.lessgo.in';

export const metadata: Metadata = {
  title: 'Features — plan, RSVP, split and settle',
  description:
    'Everything Lessgo does: events with RSVP, group expense splitting and UPI settle-up, friend groups and Buzz, spontaneous Vibes, shared galleries and tickets.',
  alternates: { canonical: '/features' },
};

const COMPARISON = {
  columns: ['Lessgo', 'Splitwise', 'Partiful / Luma', 'A group chat'],
  rows: [
    { label: 'Create events with RSVP', values: [true, false, true, false] },
    { label: 'Split and settle expenses', values: [true, true, false, false] },
    { label: 'Spontaneous same-day plans', values: [true, false, false, true] },
    { label: 'Friend groups with history', values: [true, true, false, true] },
    { label: 'Shared photos, tickets & docs', values: [true, false, false, true] },
    { label: 'Guests can reply without installing', values: [true, false, true, true] },
    { label: 'Friends-only, no public feed', values: [true, true, false, true] },
    { label: 'The whole hangout in one place', values: [true, false, false, false] },
  ],
};

export default function FeaturesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema(url, [
          { name: 'Home', path: '/' },
          { name: 'Features', path: '/features' },
        ])}
      />

      <PageHeader
        eyebrow="Features"
        title={
          <>
            One app for the <span className="text-gradient">whole hangout</span>.
          </>
        }
        body="Most apps take one slice of a night out. Lessgo carries the plan the whole way — from the first “are we doing this?” to the last rupee settled."
      />

      <FeatureRows />

      {/* ── Comparison ───────────────────────────────────────────────────── */}
      <Section tone="raised">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="How it compares"
              title={
                <>
                  Four apps&apos; worth of jobs, <span className="text-gradient">one app</span>.
                </>
              }
              body="Nothing against the others — we just got tired of switching between them mid-plan."
            />
          </Reveal>

          <Reveal delay={80} className="mt-12">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 overflow-hidden rounded-[24px] border border-line bg-surface text-sm">
                <caption className="sr-only">
                  Feature comparison between Lessgo, Splitwise, Partiful or Luma, and a plain
                  group chat.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b border-line px-5 py-4 text-left font-semibold">
                      <span className="sr-only">Capability</span>
                    </th>
                    {COMPARISON.columns.map((col, i) => (
                      <th
                        key={col}
                        scope="col"
                        className={`border-b border-line px-5 py-4 text-center font-bold ${
                          i === 0 ? 'text-ink' : 'text-ink-faint'
                        }`}
                      >
                        {i === 0 ? <span className="text-gradient">{col}</span> : col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.rows.map((row, r) => (
                    <tr key={row.label} className={r % 2 ? 'bg-bg-elev' : ''}>
                      <th
                        scope="row"
                        className="border-b border-line px-5 py-4 text-left font-medium text-ink-muted"
                      >
                        {row.label}
                      </th>
                      {row.values.map((value, i) => (
                        <td key={i} className="border-b border-line px-5 py-4 text-center">
                          {value ? (
                            <>
                              <Check
                                className={`mx-auto h-5 w-5 ${i === 0 ? 'text-split' : 'text-ink-faint'}`}
                                aria-hidden="true"
                              />
                              <span className="sr-only">Yes</span>
                            </>
                          ) : (
                            <>
                              <Minus className="mx-auto h-5 w-5 text-ink-faint opacity-40" aria-hidden="true" />
                              <span className="sr-only">No</span>
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-ink-faint">
              Comparison reflects each product&apos;s core, generally available features as of
              this page&apos;s last update. Product names are trademarks of their respective
              owners.
            </p>
          </Reveal>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
