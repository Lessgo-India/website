import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@ui/Section';
import { PageHeader, Prose } from '@ui/PageHeader';

// NOTE FOR THE TEAM: this policy is drafted to reflect what the product
// actually does. Have qualified counsel review it, and confirm the Grievance
// Officer details below, before the public launch.
const LAST_UPDATED = '4 September 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Lessgo collects, uses and protects your data — including contacts, phone verification and analytics — and the rights you have under India’s DPDP Act 2023.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow={`Last updated ${LAST_UPDATED}`}
        title="Privacy Policy"
        body="Lessgo is built around the friends already in your phone, so we take this seriously. Here is exactly what we collect, why, and what you can do about it."
      />

      <Section className="!pt-0">
        <Container>
          <Prose>
            <h2>Who we are</h2>
            <p>
              Lessgo (&ldquo;Lessgo&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a mobile
              application and this website that help friend groups plan hangouts, collect RSVPs
              and split shared expenses. We are the data fiduciary for the personal data
              described below. You can reach us any time at{' '}
              <a href="mailto:privacy@lessgo.com">privacy@lessgo.com</a>.
            </p>

            <h2>What we collect</h2>

            <h3>On this website</h3>
            <ul>
              <li>
                <strong>Early-access signups.</strong> If you submit your email address, we store
                the normalized address, signup source and submission timestamps in our signup
                database so we can tell you when the app is available. We do not use it for
                anything else.
              </li>
              <li>
                <strong>Analytics.</strong> Only if you agree. If you select
                &ldquo;Allow&rdquo; on the consent banner, we load PostHog (hosted in the EU) to
                see which pages and sections are useful. Text is masked, session recording is
                off, and no analytics scripts load before you consent.
              </li>
              <li>
                <strong>Server logs.</strong> Our hosting provider records standard request logs,
                including IP address, for security and reliability.
              </li>
            </ul>

            <h3>In the app</h3>
            <ul>
              <li>
                <strong>Your phone number,</strong> used to create and verify your account with a
                one-time code.
              </li>
              <li>
                <strong>Your profile</strong> — name, date of birth, gender and profile picture,
                as you provide them.
              </li>
              <li>
                <strong>Contacts,</strong> only if you grant the permission. We use it to show
                which of your contacts already use Lessgo so you can invite them. We do not
                message your contacts on your behalf, we do not build profiles of people who are
                not users, and we never sell or share contact data.
              </li>
              <li>
                <strong>Content you create</strong> — events, RSVPs, groups, vibes, messages,
                expenses, photos and documents you choose to upload.
              </li>
              <li>
                <strong>Location,</strong> only when you use it to set a meeting point. We do not
                track your location in the background.
              </li>
              <li>
                <strong>Device and notification tokens,</strong> so we can deliver push alerts
                you have asked for.
              </li>
              <li>
                <strong>App analytics,</strong> only if you agree. Google Firebase records
                privacy-safe screen visits, basic app and device usage, and one-time activation
                milestones so we can understand aggregate product usage. We do not include your
                phone number, contacts, messages or event content, and you can withdraw consent
                in General Settings.
              </li>
            </ul>

            <h2>Why we use it</h2>
            <ul>
              <li>To create and secure your account and verify it is really you.</li>
              <li>To deliver the service — events, RSVPs, groups, expenses and sharing.</li>
              <li>To send notifications you have opted into.</li>
              <li>To keep Lessgo safe, prevent abuse and debug problems.</li>
              <li>To understand aggregate product usage, where you have consented.</li>
            </ul>
            <p>
              We do not sell your personal data. We do not run advertising, and we do not share
              your data with advertisers or data brokers.
            </p>

            <h2>Who we share it with</h2>
            <p>
              We share data only with service providers who process it on our behalf, under
              contract, for the purposes above:
            </p>
            <ul>
              <li>
                <strong>Google Firebase</strong> — phone verification and authentication, plus
                aggregate app analytics only where you have consented.
              </li>
              <li>
                <strong>Amazon Web Services and Microsoft Azure</strong> — storage for images,
                documents and application data.
              </li>
              <li>
                <strong>Railway</strong> — application hosting.
              </li>
              <li>
                <strong>PostHog (EU)</strong> — product analytics, only where you have consented.
              </li>
            </ul>
            <p>
              We may also disclose data where we are legally required to, or where it is
              necessary to protect the rights and safety of our users.
            </p>

            <h2>How long we keep it</h2>
            <p>
              We keep your account data for as long as your account is active. When you delete
              your profile, we delete or anonymise your personal data, except where we are
              required to retain something to meet a legal obligation or resolve a dispute.
              Early-access emails are deleted once the launch communication is complete or when
              you ask us to remove them, whichever comes first.
            </p>

            <h2>Your rights</h2>
            <p>
              Under India&rsquo;s Digital Personal Data Protection Act, 2023 &mdash; and
              equivalent rights if you are covered by other privacy laws &mdash; you can:
            </p>
            <ul>
              <li>Access a summary of the personal data we hold about you.</li>
              <li>Correct or complete data that is inaccurate.</li>
              <li>Erase your data, including by deleting your profile in the app.</li>
              <li>Withdraw consent you previously gave, including for analytics.</li>
              <li>Nominate another person to exercise these rights on your behalf.</li>
              <li>Raise a grievance with us, and escalate to the Data Protection Board of India.</li>
            </ul>
            <p>
              To exercise any of these, email{' '}
              <a href="mailto:privacy@lessgo.com">privacy@lessgo.com</a>. You can also delete
              your profile directly in the app under <strong>Profile → Data &amp; Privacy →
              Delete Profile</strong>.
            </p>

            <h2 id="grievance">Grievance Officer</h2>
            <p>
              In line with the DPDP Act 2023 and the Information Technology Act, 2000, you can
              contact our Grievance Officer about any concern regarding your personal data. We
              acknowledge complaints within 48 hours and aim to resolve them within 30 days.
            </p>
            <p>
              <strong>Grievance Officer, Lessgo</strong>
              <br />
              Email: <a href="mailto:grievance@lessgo.com">grievance@lessgo.com</a>
              <br />
              India
            </p>

            <h2>Children</h2>
            <p>
              Lessgo is not intended for anyone under 13, and we do not knowingly collect data
              from children. Where the law requires a higher minimum age or verifiable parental
              consent, that requirement applies instead. If you believe a child has given us
              personal data, write to us and we will remove it.
            </p>

            <h2>Cookies and similar technologies</h2>
            <p>
              This site uses local storage to remember your theme preference and your analytics
              choice &mdash; both strictly necessary for the site to behave as you asked.
              Analytics storage is only set after you select &ldquo;Allow&rdquo;. You can change
              your mind by clearing this site&rsquo;s storage in your browser.
            </p>

            <h2>Security</h2>
            <p>
              Data is encrypted in transit. Access to production systems is restricted to
              personnel who need it. No system is perfectly secure, but if a breach affects your
              data we will notify you and the relevant authority as required by law.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              If we make a material change we will update the date at the top of this page and,
              where the change is significant, tell you in the app. Continuing to use Lessgo
              after a change means you accept the updated policy.
            </p>

            <h2>Contact</h2>
            <p>
              Privacy questions: <a href="mailto:privacy@lessgo.com">privacy@lessgo.com</a>.
              Anything else: <a href="mailto:hello@lessgo.com">hello@lessgo.com</a>. See also our{' '}
              <Link href="/terms">Terms of Use</Link>.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}
