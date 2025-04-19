/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost', 'word-ladder-war.vercel.app'],
    unoptimized: true,
  },
  // Ensure environment variables are properly handled
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://word-ladder-war.vercel.app',
  },
};

export default nextConfig;
