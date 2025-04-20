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
  // Remove environment variable dependency
};

export default nextConfig;
