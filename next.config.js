/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Do NOT use 'standalone' for Vercel — Vercel's build system handles optimization.
  // Standalone is only for Docker/self-hosted deployments.
  // output: 'standalone',

  // Supabase keys are loaded from Vercel Environment Variables
  // The anon key is safe to expose (it's a public key with RLS)

  // TypeScript and ESLint errors will fail the build (as they should)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Image optimization — allow Supabase-hosted avatars
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Security headers applied via middleware.ts — no need to duplicate here

  // Webpack config to handle Node.js modules gracefully
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle Node.js modules for the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
