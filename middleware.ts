import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'curez_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/journal', '/session'];

// Public routes that should redirect to dashboard if authenticated
const AUTH_ROUTES = ['/auth', '/login'];

// Get secret key for JWT verification
const getSecretKey = () => new TextEncoder().encode(SESSION_SECRET);

/**
 * Verify session token from cookie
 */
async function verifySession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const expiresAt = (payload as any).expiresAt;
    
    // Check if session is expired
    if (expiresAt && expiresAt < Date.now()) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get session token from cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = token ? await verifySession(token) : false;
  
  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the route is an auth page
  const isAuthRoute = AUTH_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Redirect to auth if accessing protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    const authUrl = new URL('/auth', request.url);
    authUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(authUrl);
  }
  
  // Redirect to dashboard if accessing auth pages while authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
