const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  transpilePackages: ['@interchain-ui/react'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    // Force lru-cache to use CJS build to avoid SWC transform issue with private class methods
    const lruCacheCjs = path.join(__dirname, 'node_modules', 'lru-cache', 'dist', 'commonjs', 'index.js')
    config.resolve.alias = {
      ...config.resolve.alias,
      'lru-cache': lruCacheCjs,
    };
    return config;
  },
}

module.exports = nextConfig
