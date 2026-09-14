import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@ui/Section';
import { PageHeader, Prose } from '@ui/PageHeader';

const LAST_UPDATED = '13 September 2026';

export const metadata: Metadata = {
  title: 'Child Safety Standards',
  description:
    'Lessgo standards for preventing and responding to child sexual abuse and exploitation, including how to report a concern.',
  alternates: { canonical: '/child-safety' },
};

export default function ChildSafetyPage() {
  return (
    <>
      <PageHeader
        eyebrow={`Last updated ${LAST_UPDATED}`}
        title="Child Safety Standards"
        body="Lessgo has zero tolerance for child sexual abuse and exploitation. These standards apply to every user and all content shared through Lessgo."
      />

      <Section className="!pt-0">
        <Container>
          <Prose>
            <h2>Our standard</h2>
            <p>
              Lessgo prohibits child sexual abuse and exploitation (CSAE) in every form. Users
              must not create, request, upload, store, share, promote or facilitate child sexual
              abuse material (CSAM), grooming, sextortion, trafficking, sexual solicitation of
              a child, or any other conduct that sexually exploits or endangers a child.
            </p>
            <p>
              Lessgo is not intended for children under 13. Where local law requires a higher
              minimum age or parental consent, that requirement applies. Age eligibility never
              limits our obligation to act on a child-safety concern.
            </p>

            <h2>Report a concern</h2>
            <p>
              You can report a user privately from the Lessgo app. Open the person&apos;s profile,
              select <strong>Report user</strong>, choose <strong>Inappropriate content or behavior</strong>{' '}
              or <strong>Safety concern</strong>, add the details a reviewer needs, and submit the
              report. The reported user is not told who submitted it.
            </p>
            <p>
              You can also email our designated child-safety contact at{' '}
              <a href="mailto:privacy@lessgo.in?subject=Child%20Safety%20Concern">
                privacy@lessgo.in
              </a>
              . Do not download, forward or attach suspected CSAM. Instead, describe where you
              encountered it and provide only the information needed to locate the account or
              content safely.
            </p>
            <p>
              If a child may be in immediate danger, contact local emergency services or law
              enforcement first. The in-app report and Lessgo email address are not emergency
              services.
            </p>

            <h2>How we respond</h2>
            <p>
              Lessgo prioritises child-safety reports and reviews them privately. When we become
              aware of suspected CSAE or CSAM, we take appropriate action based on the report and
              applicable law. This may include restricting access to content, removing content,
              restricting or terminating accounts, preserving relevant information where
              legally permitted or required, and preventing further abuse of the Service.
            </p>
            <p>
              We report apparent CSAM and other child-safety offences to the appropriate regional
              or national authorities when required by law, respond to valid legal requests, and
              cooperate with lawful investigations. We do not tolerate retaliation against
              anyone who makes a good-faith safety report.
            </p>

            <h2>Safety contact</h2>
            <p>
              Lessgo&apos;s designated point of contact for child-safety practices and compliance is{' '}
              <a href="mailto:privacy@lessgo.in?subject=Child%20Safety%20Compliance">
                privacy@lessgo.in
              </a>
              . This contact handles questions from users, Google Play and relevant authorities
              about our CSAE prevention and response practices.
            </p>

            <h2>Related policies</h2>
            <p>
              These standards form part of our <Link href="/terms">Terms of Use</Link>. Our{' '}
              <Link href="/privacy">Privacy Policy</Link> explains how safety reports are handled
              and retained.
            </p>
          </Prose>
        </Container>
      </Section>
    </>
  );
}