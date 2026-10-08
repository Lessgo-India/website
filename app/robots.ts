import type { MetadataRoute } from 'next';
import { SITE_URL } from '@web/lib/config';

const base = SITE_URL || 'https://lessgo.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in surfaces, private invites, admin tools and mutations have
        // nothing to index. /partner itself is the public partner launch page.
        disallow: [
          '/api/',
          '/me',
          '/onboarding',
          '/e/',
          '/admin',
          '/partner/login',
          '/partner/signup',
          '/partner/dashboard',
          '/partner/campaigns',
          '/partner/integrations',
          '/partner/outlets',
          '/partner/redeem',
          '/partner/sales',
          '/partner/settings',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
