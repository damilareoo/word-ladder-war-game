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
  // Add configuration for handling client-only pages
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'word-ladder-war.vercel.app'],
    },
  },
};

export default nextConfig;
