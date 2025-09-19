import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting
// In production, use Redis or another distributed cache
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default: 15 minutes)
  max?: number; // Maximum number of requests per window (default: 100)
  message?: string; // Error message to return when rate limited
  keyGenerator?: (req: NextRequest) => string; // Function to generate key for rate limiting
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req) => {
      // Use IP address as default key
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
      return ip;
    }
  } = options;

  return async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
    const key = keyGenerator(req);
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up on each request
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }
    }

    // Get or create rate limit data for this key
    let limitData = rateLimitStore.get(key);

    if (!limitData || limitData.resetTime < now) {
      // Create new window
      limitData = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, limitData);
    } else {
      // Increment count in current window
      limitData.count++;
    }

    // Check if limit exceeded
    if (limitData.count > max) {
      const retryAfter = Math.ceil((limitData.resetTime - now) / 1000);

      return NextResponse.json(
        {
          error: message,
          retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': limitData.resetTime.toString(),
            'Retry-After': retryAfter.toString()
          }
        }
      );
    }

    // Add rate limit headers to help clients
    const remaining = Math.max(0, max - limitData.count);

    // Return null to indicate request should continue
    // The calling code should add these headers to the response
    return null;
  };
}

// Preset rate limiters for different use cases
export const rateLimiters = {
  // Strict limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.'
  }),

  // Standard API limit
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many API requests. Please try again later.'
  }),

  // Relaxed limit for search/read operations
  search: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many search requests. Please slow down.'
  }),

  // Very strict limit for admin operations
  admin: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Only 20 admin operations per hour
    message: 'Admin operation rate limit exceeded.'
  }),

  // Strict limit for AI/expensive operations
  ai: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Only 10 AI requests per 5 minutes
    message: 'AI service rate limit exceeded. Please wait before trying again.'
  })
};

/**
 * Helper function to apply rate limiting to an API route handler
 */
export async function withRateLimit(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
  limiter = rateLimiters.api
): Promise<NextResponse> {
  const rateLimitResponse = await limiter(req);

  if (rateLimitResponse) {
    return rateLimitResponse; // Return rate limit error
  }

  // Continue with the handler
  return handler();
}