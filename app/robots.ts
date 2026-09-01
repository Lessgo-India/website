import type { MetadataRoute } from 'next';
import { SITE_URL } from '@web/lib/config';

const base = SITE_URL || 'https://www.lessgo.in';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in surfaces, private invites, the admin tool and the API all
        // have nothing to index.
        disallow: ['/api/', '/me', '/onboarding', '/e/', '/admin'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
