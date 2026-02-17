/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid loading broken SWC binary on this Windows setup; use Babel instead
  swcMinify: false,
  images: {
    domains: [
      'ipfs.io',
      'gateway.pinata.cloud',
      'nftstorage.link',
      'arweave.net',
      'cloudflare-ipfs.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig
