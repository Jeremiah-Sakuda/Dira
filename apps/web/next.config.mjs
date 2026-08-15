/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@dira/action-ledger',
    '@dira/adapter-calendar',
    '@dira/adapter-gmail',
    '@dira/adapter-organization',
    '@dira/adapter-recruiter',
    '@dira/agent',
    '@dira/commitment-model',
    '@dira/constraint-engine',
    '@dira/event-schema',
    '@dira/fixtures',
    '@dira/observability',
    '@dira/policy-engine',
    '@dira/propagation-engine',
    '@dira/tool-contracts',
  ],
  webpack: (config) => {
    // The engine packages use NodeNext ESM specifiers ('./time.js' → time.ts).
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
