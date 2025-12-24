import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This is a placeholder middleware for authentication
// Will be fully implemented in Phase 2 (T029) with NextAuth.js configuration
export function middleware(request: NextRequest) {
  // For now, allow all requests
  // Authentication logic will be added in Phase 2: Foundational
  return NextResponse.next()
}

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
