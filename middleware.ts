// T029: Next.js Middleware with NextAuth.js v5 Integration
// Protects routes using NextAuth.js authorization callback

export { auth as middleware } from '@/lib/auth'

// Configure which routes to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
