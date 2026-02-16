import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Global Middleware Configuration
 *
 * Automatically protects routes and enforces authentication
 *
 * Features:
 * - Blocks unauthenticated access to protected routes
 * - Redirects to login page when not authenticated
 * - Logs requests in development mode
 * - Adds security headers
 *
 * Protected Routes:
 * - /dashboard/** - Main application
 * - /sales/** - Sales management
 * - /purchases/** - Purchase management
 * - /items/** - Inventory management
 * - /customers/** - Customer management
 * - /suppliers/** - Supplier management
 * - /payments/** - Payment tracking
 * - /returns/** - Returns management
 * - /reports/** - Reports and analytics
 * - /settings/** - Settings
 * - /api/** - All API routes (except /api/auth/**)
 */

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`, {
        user: token?.email,
        role: token?.role,
        tenantId: token?.tenantId,
      })
    }

    // Add security headers
    const response = NextResponse.next()

    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY')

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff')

    // Enable XSS protection
    response.headers.set('X-XSS-Protection', '1; mode=block')

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return response
  },
  {
    callbacks: {
      /**
       * Authorization callback
       * Returns true if user is authorized to access the route
       */
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public routes (login, register, onboarding, etc.)
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/onboarding') ||
          pathname.startsWith('/api/tenants')
        ) {
          return true
        }

        // Require authentication for all other routes
        if (!token) {
          return false
        }

        // Check if user has a tenant associated
        if (!token.tenantId) {
          console.warn(
            `User ${token.email} authenticated but has no tenantId`
          )
          return false
        }

        // User is authenticated and has a tenant
        return true
      },
    },
    pages: {
      signIn: '/auth/login',
      error: '/auth/error',
    },
  }
)

/**
 * Middleware Configuration
 *
 * Defines which routes the middleware should run on
 * Uses Next.js matcher pattern
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - /auth/login (login page)
     * - /auth/register (registration page)
     * - /api/auth/** (NextAuth API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
