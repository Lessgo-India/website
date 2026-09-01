import type { MetadataRoute } from 'next';
import { SITE_URL } from '@web/lib/config';

const base = SITE_URL || 'https://www.lessgo.in';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' }[] = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/download', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/help', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/whats-new', priority: 0.5, changeFrequency: 'weekly' },
    { path: '/privacy', priority: 0.4, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.4, changeFrequency: 'monthly' },
    { path: '/delete-account', priority: 0.4, changeFrequency: 'monthly' },
  ];

  return routes.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
