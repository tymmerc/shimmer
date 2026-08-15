/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/shimmer',
  assetPrefix: '/shimmer',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

module.exports = nextConfig;
