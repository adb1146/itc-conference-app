/**
 * Rate Limiting Middleware for API Protection
 * Prevents abuse and protects against DoS attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

// Rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // AI endpoints - expensive operations
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'Too many AI requests. Please wait before trying again.'
  },
  // Chat endpoints - moderate rate
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    message: 'Too many chat messages. Please slow down.'
  },
  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Too many search requests. Please wait.'
  },
  // General API endpoints
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests. Please try again later.'
  },
  // Auth endpoints - strict rate limiting
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please wait 15 minutes.'
  },
  // Admin endpoints
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Admin rate limit exceeded.'
  }
};

// LRU cache for tracking request counts
const rateLimitCache = new LRUCache<string, { count: number; resetTime: number }>({
  max: 10000, // Store up to 10,000 IP records
  ttl: 15 * 60 * 1000, // 15 minutes TTL
});

/**
 * Get client identifier (IP address or user ID)
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (for proxy/load balancer scenarios)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to request IP (may be localhost in dev)
  return (request as any).ip || 'unknown';
}

/**
 * Rate limiter middleware
 */
export async function rateLimit(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'general'
): Promise<NextResponse | null> {
  const config = RATE_LIMITS[limitType];
  const clientId = getClientId(request);
  const key = `${limitType}:${clientId}`;

  const now = Date.now();
  const record = rateLimitCache.get(key);

  if (!record || now > record.resetTime) {
    // New window or expired window
    rateLimitCache.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return null; // Allow request
  }

  if (record.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    return NextResponse.json(
      {
        error: config.message,
        retryAfter: retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
        }
      }
    );
  }

  // Increment counter
  record.count++;
  rateLimitCache.set(key, record);

  // Add rate limit headers to help clients
  return null; // Allow request but headers will be added by the endpoint
}

/**
 * Get rate limit headers for successful requests
 */
export function getRateLimitHeaders(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'general'
): Record<string, string> {
  const config = RATE_LIMITS[limitType];
  const clientId = getClientId(request);
  const key = `${limitType}:${clientId}`;

  const record = rateLimitCache.get(key);
  if (!record) {
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': config.maxRequests.toString(),
    };
  }

  const remaining = Math.max(0, config.maxRequests - record.count);

  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
  };
}

/**
 * Clear rate limit for a specific client (e.g., after successful auth)
 */
export function clearRateLimit(request: NextRequest, limitType: keyof typeof RATE_LIMITS): void {
  const clientId = getClientId(request);
  const key = `${limitType}:${clientId}`;
  rateLimitCache.delete(key);
}

/**
 * Check if client is rate limited without incrementing counter
 */
export function isRateLimited(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'general'
): boolean {
  const config = RATE_LIMITS[limitType];
  const clientId = getClientId(request);
  const key = `${limitType}:${clientId}`;

  const now = Date.now();
  const record = rateLimitCache.get(key);

  if (!record || now > record.resetTime) {
    return false;
  }

  return record.count >= config.maxRequests;
}