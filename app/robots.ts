import type { MetadataRoute } from 'next';
import { SITE_URL } from '@web/lib/config';

const base = SITE_URL || 'https://lessgo.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in surfaces and the API have nothing to index.
        disallow: ['/api/', '/me', '/onboarding'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
