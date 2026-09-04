import type { Metadata } from 'next';
import { faq } from '@content/site';
import { SITE_URL } from '@web/lib/config';
import { Container, Section, SectionHeading } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { Faq } from '@ui/Faq';
import { JsonLd, appSchema, faqSchema, organizationSchema } from '@ui/JsonLd';
import { Hero } from '@ui/sections/Hero';
import { EventTypeMarquee } from '@ui/sections/EventTypeMarquee';
import { ChaosToPlan } from '@ui/sections/ChaosToPlan';
import { FeatureRows } from '@ui/sections/FeatureRows';
import { ProductStory } from '@ui/sections/ProductStory';
import { HowItWorks } from '@ui/sections/HowItWorks';
import { ShareLoop } from '@ui/sections/ShareLoop';
import { PrivacySection } from '@ui/sections/PrivacySection';
import { FinalCta } from '@ui/sections/FinalCta';

const url = SITE_URL || 'https://lessgo.com';

export const metadata: Metadata = {
  // Absolute so the layout's "%s · Lessgo" template doesn't repeat the brand.
  title: { absolute: 'Lessgo — Hangouts made easy' },
  description:
    'Party is on you. Managing is on us. Lessgo turns group-chat chaos into one app — plan the hangout, collect RSVPs, split the bill and settle up. Free to start, built in India.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema(url)} />
      <JsonLd data={appSchema(url)} />
      <JsonLd data={faqSchema()} />

      <div className="md:hidden">
        <Hero />
        <EventTypeMarquee />
        <ChaosToPlan />
        <FeatureRows id="mobile-features" />
      </div>
      <div className="hidden md:block">
        <ProductStory />
      </div>
      <HowItWorks />
      <ShareLoop />
      <PrivacySection />

      <Section tone="raised" id="faq">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Questions"
              title={
                <>
                  The stuff people <span className="text-gradient">actually ask</span>.
                </>
              }
            />
          </Reveal>
          <Reveal delay={80} className="mt-12">
            <Faq items={faq} />
          </Reveal>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
