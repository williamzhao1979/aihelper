import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Remove any experimental features that might cause issues
  },
  // Ensure proper static generation
  output: 'standalone',
  // Add proper error handling for missing translations
  i18n: undefined, // Let next-intl handle i18n
};

export default withNextIntl(nextConfig);
