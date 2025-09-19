import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Add security headers to the response
 */
function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  // Content Security Policy - Prevent XSS attacks
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com https://api.openai.com https://api.pinecone.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CORS headers for API routes
  const origin = request.headers.get('origin');
  if (origin && request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

// Routes that require authentication
const protectedRoutes = [
  '/schedule',
  '/profile'
  // Removed /chat/intelligent and /agenda/intelligent to allow guest access
];

// Routes that require admin access
const adminRoutes = [
  '/admin'
];

// Routes that should redirect to home if authenticated
const authRoutes = [
  '/auth/signin',
  '/auth/register'
];

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Add Security Headers to all responses
  addSecurityHeaders(response, request);

  // Check if the route requires admin access
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if it's an auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Redirect to home if accessing admin route without admin privileges
  if (isAdminRoute) {
    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      const redirectResponse = NextResponse.redirect(signInUrl);
      addSecurityHeaders(redirectResponse, request);
      return redirectResponse;
    }
    
    const isAdmin = Boolean((token as any).isAdmin);
    if (!isAdmin) {
      const redirectResponse = NextResponse.redirect(new URL('/', request.url));
      addSecurityHeaders(redirectResponse, request);
      return redirectResponse;
    }
  }

  // Redirect to signin if accessing protected route without auth
  if (isProtectedRoute && !token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    const redirectResponse = NextResponse.redirect(signInUrl);
    addSecurityHeaders(redirectResponse, request);
    return redirectResponse;
  }

  // Redirect to home if accessing auth routes while authenticated
  if (isAuthRoute && token) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    addSecurityHeaders(redirectResponse, request);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
