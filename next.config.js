/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for Docker deployment — generates minimal server.js
  output: 'standalone',
  // Supabase keys are loaded from .env.local or Vercel env vars
  // The anon key is safe to expose (it's a public key with RLS)
  // but should still be configured via environment variables
};

module.exports = nextConfig;
