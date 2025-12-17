import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker/Cloud Run
  output: 'standalone',

  experimental: {
    optimizePackageImports: ['@google/genai'],
  },
};

export default nextConfig;
