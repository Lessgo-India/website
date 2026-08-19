/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The marketing pages are reused as-is via a client catch-all; skip ESLint
  // during builds so a stray lint rule can't block the deploy.
  eslint: { ignoreDuringBuilds: true },
  // We render remote covers/avatars with plain <img>, so image optimization is
  // unnecessary and this avoids per-domain allow-listing.
  images: { unoptimized: true },
};

export default nextConfig;
