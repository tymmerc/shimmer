/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/shimmer/v4',
  assetPrefix: '/shimmer/v4',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

module.exports = nextConfig;
