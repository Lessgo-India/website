import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, Mail, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { SITE_URL } from '@web/lib/config';
import DeleteAccountFlow from '@web/components/DeleteAccountFlow';
import { JsonLd, breadcrumbSchema } from '@ui/JsonLd';
import { PageHeader } from '@ui/PageHeader';
import { Container, Section } from '@ui/Section';

const url = SITE_URL || 'https://www.lessgo.in';

export const metadata: Metadata = {
  title: 'Delete your Lessgo account',
  description:
    'Permanently delete your Lessgo account after securely verifying your phone number with a Firebase one-time code.',
  alternates: { canonical: '/delete-account' },
};

const STEPS = [
  {
    icon: KeyRound,
    title: 'Verify your Lessgo phone number',
    body: 'Enter the phone number linked to your account and complete the Firebase one-time-code check.',
  },
  {
    icon: ShieldCheck,
    title: 'Review what deletion means',
    body: 'We show the verified account and explain what is deleted, de-identified, or retained before you confirm.',
  },
  {
    icon: Trash2,
    title: 'Confirm permanent deletion',
    body: 'Select the acknowledgement and choose “Delete my account”. The page signs out after Lessgo confirms completion.',
  },
] as const;

export default function DeleteAccountPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema(url, [
          { name: 'Home', path: '/' },
          { name: 'Delete account', path: '/delete-account' },
        ])}
      />

      <PageHeader
        eyebrow="Account deletion"
        title="Delete your Lessgo account"
        body="Use this page to permanently delete your account without opening the app. Your identity comes only from a phone number verified by Firebase — we never ask you to enter a user ID."
      />

      <Section className="!pt-0">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.82fr)_minmax(380px,1.18fr)] lg:gap-16">
            <div className="space-y-10">
              <section aria-labelledby="web-deletion-steps">
                <h2 id="web-deletion-steps" className="text-2xl font-bold text-ink">
                  Delete on the web
                </h2>
                <ol className="mt-6 space-y-6">
                  {STEPS.map(({ icon: Icon, title, body }, index) => (
                    <li key={title} className="flex gap-4">
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-profile-tint text-profile">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span className="sr-only">Step {index + 1}</span>
                      </span>
                      <div>
                        <h3 className="font-semibold text-ink">{title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="border-y border-line py-7" aria-labelledby="delete-in-app">
                <div className="flex items-start gap-4">
                  <Smartphone className="mt-0.5 h-6 w-6 shrink-0 text-events" aria-hidden="true" />
                  <div>
                    <h2 id="delete-in-app" className="text-lg font-bold text-ink">
                      Prefer the Lessgo app?
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      Open <strong className="font-semibold text-ink">Profile</strong>, scroll to{' '}
                      <strong className="font-semibold text-ink">Danger Zone</strong>, then choose{' '}
                      <strong className="font-semibold text-ink">Delete Profile</strong>.
                    </p>
                  </div>
                </div>
              </section>

              <section aria-labelledby="deletion-data">
                <h2 id="deletion-data" className="text-lg font-bold text-ink">
                  What happens to your data
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  The deletion process removes your core profile and account access, requests
                  deactivation of notification tokens, and cleans up personal profile uploads and
                  active membership data. Shared event, message, and transaction records may be
                  retained or de-identified where other participants rely on them or where legal,
                  fraud-prevention, accounting, or dispute-handling obligations apply. Read the
                  full details in our{' '}
                  <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </section>

              <section aria-labelledby="lost-phone-access">
                <div className="flex items-start gap-4">
                  <Mail className="mt-0.5 h-6 w-6 shrink-0 text-gold" aria-hidden="true" />
                  <div>
                    <h2 id="lost-phone-access" className="text-lg font-bold text-ink">
                      Lost access to your phone?
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      Email{' '}
                      <a
                        href="mailto:privacy@lessgo.in"
                        className="font-semibold text-ink underline underline-offset-4"
                      >
                        privacy@lessgo.in
                      </a>{' '}
                      for a reviewed deletion request. Never email an OTP, password, or identity
                      document.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div id="delete-account-form">
              <DeleteAccountFlow />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}