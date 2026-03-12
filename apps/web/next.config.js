/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui"],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
