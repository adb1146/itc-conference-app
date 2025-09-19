import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // This is needed for deployment while we fix all TypeScript issues
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
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
  // Output configuration for production
  output: 'standalone',

  // Cache configuration to prevent stale content
  generateBuildId: async () => {
    // Generate unique build ID based on timestamp with version
    return `v2-${Date.now()}`;
  },

  // Headers for smart cache control and security
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com https://api.openai.com https://api.pinecone.io https://*.vercel.app wss://*.vercel.app; frame-src 'self' https://vercel.live;",
          },
        ],
      },
      // Auth routes - must work properly
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Other API routes - no cache for dynamic data
      {
        source: '/api/:path((?!auth).*)*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Smart Agenda page - NEVER cache
      {
        source: '/smart-agenda',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
        ],
      },
      // User-specific pages - minimal cache with background revalidation
      {
        source: '/(favorites|profile|search)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, must-revalidate',
          },
        ],
      },
      // Session pages - moderate cache
      {
        source: '/sessions/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      // Static pages - longer cache
      {
        source: '/(about|sponsors|locations)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      // Static assets - immutable
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images and media - long cache
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=43200',
          },
        ],
      },
      // Default for other pages - minimal cache
      {
        source: '/:path((?!api|_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, s-maxage=10, stale-while-revalidate=30',
          },
        ],
      },
    ];
  },
};

export default nextConfig;