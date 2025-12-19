import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker/Cloud Run
  output: 'standalone',

  eslint: {
    dirs: ['app', 'lib', 'tests', 'types', 'supabase'],
  },

  experimental: {
    optimizePackageImports: ['@google/genai'],
  },
};

export default nextConfig;
