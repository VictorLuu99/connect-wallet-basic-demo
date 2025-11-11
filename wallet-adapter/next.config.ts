import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: false,
  eslint: {
    // This disables ESLint during builds
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default nextConfig;
