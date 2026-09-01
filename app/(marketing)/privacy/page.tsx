import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@ui/Section';
import { PageHeader, Prose } from '@ui/PageHeader';

// NOTE FOR THE TEAM: this policy is drafted to reflect what the product
// actually does. Have qualified counsel review it, and confirm the Grievance
// Officer details below, before the public launch.
const LAST_UPDATED = '1 September 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Lessgo India collects, uses, shares, protects and deletes data for the Lessgo app and website.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow={`Last updated ${LAST_UPDATED}`}
        title="Privacy Policy"
        body="Your plans involve people you trust. We believe the way we handle your data should earn that same trust, so this policy explains our practices in plain language."
      />

      <Section className="!pt-0">
        <Container>
          <Prose>
            <h2>Who we are</h2>
            <p>
              Lessgo India (&ldquo;Lessgo&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides the Lessgo
              mobile application and website. The service helps friends plan events, collect
              RSVPs, share updates and files, and keep track of shared expenses. Lessgo India is
              the data fiduciary for the personal data described here. You can reach our privacy
              team at <a href="mailto:privacy@lessgo.in">privacy@lessgo.in</a>.
            </p>

            <h2>Our privacy commitments</h2>
            <ul>
              <li>We do not sell personal data or contact data.</li>
              <li>We do not run advertising or share data with advertisers or data brokers.</li>
              <li>We ask for device permissions in context, and you can decline them.</li>
              <li>We do not track your location in the background.</li>
              <li>
                Face ID, fingerprint and device-passcode checks are performed by your device;
                Lessgo does not receive or store your biometric information.
              </li>
            </ul>

            <h2>What we collect</h2>

            <h3>On this website</h3>
            <ul>
              <li>
                <strong>Early-access signups.</strong> If you join the early-access list, we store
                your normalized email address, signup source, submission timestamps and number
                of submissions in our signup database. We use this only for launch communication
                and related service updates.
              </li>
              <li>
                <strong>Analytics.</strong> Only if you agree. If you select
                &ldquo;Allow&rdquo; on the consent banner, we load PostHog, hosted in the EU, to
                understand page visits and which parts of the site are useful. This can include
                page paths, browser or device information and network information. Text is
                masked, session recording is off, and PostHog does not load before you consent.
              </li>
              <li>
                <strong>Server logs.</strong> Our hosting provider records standard request logs,
                which can include IP address, request time, browser information and requested
                URL, for security, abuse prevention and reliability.
              </li>
            </ul>

            <h3>In the app</h3>
            <ul>
              <li>
                <strong>Account and profile information.</strong> We collect your phone number to
                create and verify your account with a one-time code. We also store the name, date
                of birth, gender, optional email address, profile picture, status, settings and
                profile statistics you provide or build through use of the service.
              </li>
              <li>
                <strong>Contacts and invitations.</strong> If you grant contacts permission, the
                app reads contact names and phone numbers. Contact names stay on your device so
                people appear as you know them. Normalized phone numbers are sent securely to our
                servers in batches to identify which contacts use Lessgo. We keep matched Lessgo
                user IDs as your Vibe audience. If you select a person who is not on Lessgo as an
                event invitee, their phone number is stored with that event and Lessgo may send
                them an invitation SMS through Twilio. We also retain an SMS delivery record for
                the period described below. We do not message an address-book contact merely
                because you granted permission.
              </li>
              <li>
                <strong>Plans and shared activity.</strong> We store events, groups, RSVPs,
                statuses or Vibes, Buzz responses, notes, chats, polls and votes, meeting points,
                dates, links and other content you create. Depending on the feature, this content
                is visible to the people in the relevant event, group or contact audience.
              </li>
              <li>
                <strong>Expenses and payment details.</strong> We store expense descriptions,
                amounts, payer and participant identifiers, balances, settlements and remarks so
                the people involved can keep a shared record. If you add a UPI ID, it is shown to
                relevant friends when they choose to settle with you. Lessgo does not hold or
                transfer money. If you open a payment app, that provider handles the payment
                under its own terms and privacy policy.
              </li>
              <li>
                <strong>Photos and documents.</strong> We process profile and group pictures,
                event covers, gallery images, tickets, event documents and files you deliberately
                select. The My IDs feature is a private document store protected in the app by
                your device lock. Its files are kept in a dedicated private cloud container and
                opened with short-lived links. If you attach a My IDs file to an event, the event
                participants you share it with can access that attachment.
              </li>
              <li>
                <strong>Location and place searches.</strong> If you grant foreground location
                permission and open the map picker, the app can read your precise current
                coordinates to centre the map. Place searches and selected map areas are
                processed using Google Maps and Places. A location, address or map pin you choose
                to save can be stored with an event, meeting point, group Spot, Buzz or Vibe and
                shared with the relevant people. Lessgo does not request background location.
              </li>
              <li>
                <strong>Device and notification information.</strong> To provide alerts, we store
                a Firebase Cloud Messaging token, platform, device model or OS build identifier,
                app version and notification preferences. We also store notification content,
                read state and delivery records for the periods described below.
              </li>
              <li>
                <strong>Support and diagnostics.</strong> If you report a problem, we process the
                title, description, current app screen, account identifier and display name you
                submit. The optional embedded support form is hosted by Notion. Diagnostic logs
                shown in the app remain on your device unless you choose to export or share them.
              </li>
            </ul>

            <h2>Why we use it</h2>
            <ul>
              <li>To create and secure your account and verify it is really you.</li>
              <li>To find friends who already use Lessgo, when you allow contact access.</li>
              <li>To deliver invitations, events, groups, RSVPs, sharing and communication.</li>
              <li>To calculate and display shared expenses and settlement information.</li>
              <li>To store and deliver the photos and documents you choose to share.</li>
              <li>To provide maps, saved places and meeting-point features.</li>
              <li>To send notifications and service messages you request or reasonably expect.</li>
              <li>To keep Lessgo safe, prevent abuse, support users and diagnose problems.</li>
              <li>To understand aggregate product usage, where you have consented.</li>
            </ul>
            <p>
              We do not sell your personal data. We do not run advertising, and we do not share
              your data with advertisers or data brokers.
            </p>

            <h2>Who we share it with</h2>
            <p>
              <strong>People you choose to interact with.</strong> Lessgo is a shared service.
              Your profile and the content you add to an event, group, Vibe, chat or expense can
              be shown to the people who participate in that space. We limit visibility according
              to the feature and your choices; we do not make private group content public.
            </p>
            <p>
              <strong>Service providers.</strong> We use providers to operate specific parts of
              Lessgo. They process data only for those services and subject to their contractual
              and legal obligations:
            </p>
            <ul>
              <li>
                <strong>Google Firebase</strong> for phone verification, authentication and push
                notification delivery.
              </li>
              <li>
                <strong>Google Maps and Places</strong> for maps, place searches, geocoding and
                location selection.
              </li>
              <li>
                <strong>Twilio</strong> to deliver event invitation SMS messages to selected
                non-users.
              </li>
              <li>
                <strong>Microsoft Azure</strong> to store user-uploaded images and documents,
                including the private My IDs container.
              </li>
              <li>
                <strong>Railway and MongoDB</strong> for application hosting and databases.
              </li>
              <li>
                <strong>Amazon Web Services</strong> to host public Lessgo assets such as logos,
                default avatars and default covers. We do not currently use AWS for files you
                upload.
              </li>
              <li>
                <strong>PostHog (EU)</strong> for website analytics, only after you consent.
              </li>
              <li>
                <strong>Notion</strong> only when you choose to open and submit the optional
                embedded support form.
              </li>
            </ul>
            <p>
              We may also disclose data where we are legally required to, or where it is
              necessary to protect the rights and safety of our users.
            </p>

            <h2>How long we keep information</h2>
            <p>
              We do not keep every type of information for the same length of time:
            </p>
            <ul>
              <li>Account and profile data is kept while your account is active.</li>
              <li>
                My IDs and personal profile files remain until you remove them or delete your
                account.
              </li>
              <li>Vibes are automatically removed when their response window closes.</li>
              <li>
                Event gallery files and documents for a non-recurring event are normally deleted
                30 days after the event ends. Files for a recurring event can carry forward until
                the event or file is deleted.
              </li>
              <li>
                Notification-centre items and push or SMS delivery logs are normally deleted
                after 90 days.
              </li>
              <li>
                Push tokens are deactivated when you sign out or delete your account, so they
                are no longer used for delivery. Inactive token metadata and notification
                preferences may remain for security and delivery-audit purposes until the
                account deletion review is complete.
              </li>
              <li>
                Shared event, group, chat and expense records may remain while participants need
                the shared history or until the relevant event, group or record is deleted.
              </li>
              <li>
                Support and bug reports are kept while we investigate and resolve the issue, and
                then only as long as reasonably needed for security and service improvement.
              </li>
              <li>
                Early-access emails are deleted after the launch communication is complete or
                when you ask us to remove them, whichever comes first.
              </li>
              <li>
                Security and server logs are kept only for the operational period needed to
                investigate abuse, protect the service and meet legal obligations.
              </li>
            </ul>

            <h2 id="account-deletion">Account deletion</h2>
            <p>
              You can delete your account in the app under{' '}
              <strong>Profile → Danger Zone → Delete Profile</strong>. If you no longer have the
              app, visit our <Link href="/delete-account">account deletion page</Link> to submit
              a request from any browser.
            </p>
            <p>
              The current in-app flow removes your Firebase sign-in account, profile and user
              records, personal profile files and My IDs, Vibes and group memberships. It also
              stops push delivery to your registered devices. Some shared records must remain so
              other participants do not lose their event, message and expense history.
            </p>
            <p>
              Our chosen approach is to replace your identity in retained shared records with a
              neutral deleted-user reference. That automated change is still being completed.
              Until it is deployed, a shared event, RSVP, poll, note, message, expense,
              transaction or event upload may continue to carry the phone-based identifier or
              profile details originally attached to it. Please use the{' '}
              <Link href="/delete-account">external deletion request</Link> if you would like us
              to review and manually remove or de-identify remaining references.
            </p>
            <p>
              We may retain limited information where necessary for security, fraud prevention,
              dispute resolution or a legal obligation. We restrict that information from normal
              product use and keep it only for the reason that requires it.
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
              <a href="mailto:privacy@lessgo.in">privacy@lessgo.in</a>. You can also use our{' '}
              <Link href="/delete-account">account deletion page</Link>. We may ask for a
              reasonable, secure verification before acting on a request so that nobody else can
              access or delete your account.
            </p>

            <h2 id="grievance">Grievance Officer</h2>
            <p>
              In line with the DPDP Act 2023 and the Information Technology Act, 2000, you can
              contact our Grievance Officer about any concern regarding your personal data. We
              acknowledge complaints within 48 hours and aim to resolve them within 30 days.
            </p>
            <p>
              <strong>Grievance Officer, Lessgo India</strong>
              <br />
              Email: <a href="mailto:grievance@lessgo.in">grievance@lessgo.in</a>
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
              We encrypt data in transit using HTTPS, use Firebase authentication, restrict
              production access to people who need it, and use private storage with short-lived
              access links for My IDs. Please keep your phone and one-time codes secure; Lessgo
              will never ask you to email an OTP or password. No system is perfectly secure. If
              a breach affects your data, we will notify you and the relevant authority where
              required by law.
            </p>

            <h2>Where information is processed</h2>
            <p>
              Lessgo India operates from India. Our service providers may process information in
              India and in other regions where they operate, including the European Union for
              PostHog analytics. We use appropriate contractual and security safeguards when
              information is processed outside your home region.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              If we make a material change we will update the date at the top of this page and,
              where the change is significant, tell you in the app or through another
              appropriate channel. If a change introduces a new use that requires consent, we
              will ask before using your data for that purpose. You can always stop using Lessgo
              and request deletion of your account.
            </p>

            <h2>Contact</h2>
            <p>
              Privacy and data requests:{' '}
              <a href="mailto:privacy@lessgo.in">privacy@lessgo.in</a>. Grievances:{' '}
              <a href="mailto:grievance@lessgo.in">grievance@lessgo.in</a>. General questions:{' '}
              <a href="mailto:hello@lessgo.in">hello@lessgo.in</a>. See also our{' '}
              <Link href="/terms">Terms of Use</Link>.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}
