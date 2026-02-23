import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  experimental: {
    optimizePackageImports: ['@google/genai'],
  },

  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
};

export default nextConfig;
