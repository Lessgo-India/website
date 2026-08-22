/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remote covers/avatars render with plain <img>, so image optimization is
  // unnecessary and this avoids per-domain allow-listing.
  images: { unoptimized: true },

  async redirects() {
    // Routes from the previous marketing SPA, folded into the new sitemap.
    return [
      { source: '/discover', destination: '/features', permanent: true },
      { source: '/blog', destination: '/whats-new', permanent: true },
      { source: '/legal', destination: '/privacy', permanent: true },
      { source: '/support', destination: '/help', permanent: true },
      { source: '/faq', destination: '/help', permanent: true },
      { source: '/get', destination: '/download', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
