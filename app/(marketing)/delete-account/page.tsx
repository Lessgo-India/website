import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Container, Section } from '@ui/Section';
import { PageHeader, Prose } from '@ui/PageHeader';

const DELETION_EMAIL = 'privacy@lessgo.in';
const DELETION_MAILTO =
  'mailto:privacy@lessgo.in?subject=Lessgo%20account%20deletion%20request';

export const metadata: Metadata = {
  title: 'Delete Your Account',
  description:
    'Request deletion of your Lessgo account and associated personal data from the app or from any browser.',
  alternates: { canonical: '/delete-account' },
};

export default function DeleteAccountPage() {
  return (
    <>
      <PageHeader
        eyebrow="Account and data"
        title="Delete your Lessgo account"
        body="Your account belongs to you. You can delete it in the app, or send us a request from any browser if you no longer have access."
      >
        <a
          href={DELETION_MAILTO}
          className="gradient-brand inline-flex min-h-11 items-center gap-2 rounded-md px-5 py-3 font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
        >
          <Mail aria-hidden="true" size={18} />
          Email a deletion request
        </a>
      </PageHeader>

      <Section className="!pt-0">
        <Container>
          <Prose>
            <h2>Delete your account in the app</h2>
            <p>
              Open <strong>Profile</strong>, scroll to <strong>Danger Zone</strong>, and select{' '}
              <strong>Delete Profile</strong>. The app will show what is removed and ask you to
              type a confirmation phrase before anything is deleted.
            </p>

            <h2>Request deletion without the app</h2>
            <p>
              Email <a href={DELETION_MAILTO}>{DELETION_EMAIL}</a> with the subject{' '}
              <strong>Lessgo account deletion request</strong>. Please include the phone number,
              with country code, that you used for Lessgo. This is the minimum information we
              need to locate the correct account.
            </p>
            <p>
              <strong>Please never send us an OTP, password, government ID or payment password.</strong>{' '}
              We will reply from an <strong>@lessgo.in</strong> address and use a reasonable,
              secure check to confirm that the account is yours.
            </p>

            <h2>What happens next</h2>
            <ul>
              <li>We aim to acknowledge your request within 48 hours.</li>
              <li>We may ask you to verify control of the phone number linked to the account.</li>
              <li>
                We aim to complete a verified request promptly and no later than 30 days, unless
                a legal obligation requires a different period.
              </li>
              <li>We will confirm when the deletion review is complete.</li>
            </ul>

            <h2>What we remove</h2>
            <p>
              The current account-deletion flow removes your Firebase sign-in account, Lessgo
              profile and user records, personal profile files and My IDs, Vibes and group
              memberships. It also stops push delivery to your registered devices.
            </p>

            <h2>Shared records and limited retention</h2>
            <p>
              Some information forms part of a record shared with other people. Events, RSVPs,
              polls, notes, chats, expenses, transaction ledgers and event uploads may need to
              remain so other participants do not lose their own history. Our chosen approach is
              to replace your identity in retained shared records with a neutral deleted-user
              reference.
            </p>
            <p>
              Automated de-identification is still being completed. Until it is deployed, please
              use the email request above so our team can review and manually remove or
              de-identify remaining references. Notification and delivery logs normally expire
              after 90 days. Inactive push-token metadata and notification preferences are
              included in the deletion review. We may retain narrowly limited information for
              security, fraud prevention, dispute resolution or a legal obligation, and only for
              as long as that reason requires.
            </p>

            <h2>Need help?</h2>
            <p>
              Questions are welcome at <a href="mailto:privacy@lessgo.in">privacy@lessgo.in</a>.
              You can read more about the information involved, retention periods and your rights
              in our <Link href="/privacy#account-deletion">Privacy Policy</Link>.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}