import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8000');

if (!apiBaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL is required for production builds. Rewrite destinations are ' +
      'resolved at build time, so a missing value silently ships an image that proxies /api/* ' +
      'to the wrong environment.',
  );
}

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);