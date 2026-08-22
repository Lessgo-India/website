import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@ui/Section';
import { PageHeader, Prose } from '@ui/PageHeader';

// NOTE FOR THE TEAM: drafted to match what the product actually does. Have
// qualified counsel review before the public launch.
const LAST_UPDATED = '23 August 2026';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'The terms that apply when you use the Lessgo app and website — eligibility, your account, acceptable use, expenses, and the legal bits.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow={`Last updated ${LAST_UPDATED}`}
        title="Terms of Use"
        body="The short version: be decent to each other, Lessgo keeps track of your plans and who owes what, and we are not a bank."
      />

      <Section className="!pt-0">
        <Container>
          <Prose>
            <h2>1. Accepting these terms</h2>
            <p>
              By using the Lessgo app or this website (together, the &ldquo;Service&rdquo;) you
              agree to these Terms of Use. If you do not agree, please do not use the Service.
            </p>

            <h2>2. Who can use Lessgo</h2>
            <p>
              You must be at least 13 years old, and old enough to enter a binding contract where
              you live. If your local law sets a higher minimum age for a social service, that
              age applies to you. You confirm you are not barred from using the Service under any
              applicable law.
            </p>

            <h2>3. Your account</h2>
            <p>
              Accounts are created and verified with your phone number and a one-time code. You
              are responsible for keeping access to that number secure and for activity that
              happens under your account. Tell us at{' '}
              <a href="mailto:hello@lessgo.com">hello@lessgo.com</a> if you believe your account
              has been compromised.
            </p>

            <h2>4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Harass, threaten, impersonate or abuse anyone.</li>
              <li>Upload content that is unlawful, hateful, or infringes someone&rsquo;s rights.</li>
              <li>Use the Service to send spam or unsolicited bulk invitations.</li>
              <li>
                Scrape, reverse engineer, probe or interfere with the Service or its
                infrastructure.
              </li>
              <li>Use another person&rsquo;s contact details without a legitimate reason to.</li>
            </ul>
            <p>
              We may suspend or terminate accounts that breach these terms, and remove content
              that does.
            </p>

            <h2>5. Your content</h2>
            <p>
              You keep ownership of the events, photos, documents and messages you create. You
              grant us a limited, non-exclusive licence to host, store, reproduce and display
              that content solely to operate the Service for you and the people you share it
              with. You are responsible for having the right to share whatever you upload.
            </p>

            <h2>6. Expenses and settlements</h2>
            <p>
              Lessgo is a <strong>record-keeping tool</strong>. We calculate and display balances
              between you and the people you share expenses with. We are{' '}
              <strong>not a bank, payment processor, escrow agent or money-transfer service</strong>.
              We do not hold, transmit or guarantee any funds. Where the app links out to a
              payment app such as a UPI client, that payment takes place entirely between you and
              that provider. Any dispute over money is between you and the people involved, and
              you should check the figures yourself before paying anyone.
            </p>

            <h2>7. Third-party services</h2>
            <p>
              The Service links to and relies on third-party services such as maps, app stores
              and payment apps. Their terms and privacy policies apply to your use of them, and
              we are not responsible for their content or behaviour.
            </p>

            <h2>8. Our intellectual property</h2>
            <p>
              The Lessgo name, logo, software, design and content are ours or our
              licensors&rsquo;. These terms do not grant you any right to use our branding
              without written permission. Other product names on this site are the trademarks of
              their respective owners.
            </p>

            <h2>9. Availability and changes</h2>
            <p>
              Lessgo is in active development and is currently offered in early access. We may
              add, change, suspend or remove features, and we may update these terms. If a change
              is material we will update the date above and, where appropriate, notify you in the
              app.
            </p>

            <h2>10. Ending your use</h2>
            <p>
              You can stop using Lessgo and delete your profile at any time from{' '}
              <strong>Profile → Data &amp; Privacy → Delete Profile</strong>. We may suspend or
              end your access if you breach these terms or if we are legally required to.
            </p>

            <h2>11. Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the
              fullest extent permitted by law we disclaim implied warranties of merchantability,
              fitness for a particular purpose and non-infringement. We do not warrant that the
              Service will be uninterrupted, error-free, or that any balance shown is free of
              mistakes.
            </p>

            <h2>12. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Lessgo is not liable for indirect,
              incidental, special, consequential or punitive damages, or for loss of profits,
              data or goodwill arising from your use of the Service. Nothing in these terms
              limits liability that cannot be limited by law.
            </p>

            <h2>13. Governing law</h2>
            <p>
              These terms are governed by the laws of India, and the courts of India have
              exclusive jurisdiction over any dispute, without prejudice to any mandatory
              consumer-protection rights you have where you live.
            </p>

            <h2>14. Contact</h2>
            <p>
              Questions about these terms: <a href="mailto:hello@lessgo.com">hello@lessgo.com</a>.
              See also our <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}
