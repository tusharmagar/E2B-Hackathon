/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    turbopack: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;

