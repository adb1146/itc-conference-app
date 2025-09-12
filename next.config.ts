import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],
  webpack: (config, { isServer, dev }) => {
    // Fix for CSS imports in node_modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Disable webpack cache in production to avoid build issues
    if (!dev) {
      config.cache = false;
    }
    
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Disable SWC minification if it causes issues
  swcMinify: true,
  // Output configuration for production
  output: 'standalone',
};

export default nextConfig;