import { faq, site } from '@content/site';

/** Renders a JSON-LD block. Data is authored in this repo, never user input. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function organizationSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: siteUrl,
    logo: site.logo,
    slogan: site.tagline,
    foundingLocation: { '@type': 'Place', name: 'India' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'hello@lessgo.com',
        contactType: 'customer support',
        areaServed: 'IN',
        availableLanguage: ['English'],
      },
    ],
  };
}

export function appSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: site.name,
    url: siteUrl,
    applicationCategory: 'SocialNetworkingApplication',
    operatingSystem: 'Android, iOS',
    description:
      'Plan hangouts, collect RSVPs, split expenses and settle up — all with the friends already in your phone.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    featureList: [
      'Event creation and RSVP',
      'Group expense splitting and settlement',
      'Friend groups and hangout proposals',
      'Spontaneous plan sharing with contacts',
      'Shared photo galleries and documents',
    ],
  };
}

export function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function breadcrumbSchema(siteUrl: string, trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}
