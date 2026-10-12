/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // lib/mcp is ported with ESM-style .js import specifiers ("./protocol.js").
  // Map them to the real .ts sources so webpack resolves without touching lib/.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
