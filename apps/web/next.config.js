/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@meeting-transcriber/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
