import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/auth/callback', '/auth/reset-password']

// Admin-only routes
const adminRoutes = ['/admin']

// API routes that should be handled separately
const apiRoutes = ['/api']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip for static files, images, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') ||
    apiRoutes.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next()
  }

  // Update session and get user
  const { supabaseResponse, user } = await updateSession(request)

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check admin routes (we'll implement full check in guards, this is just a basic check)
  // Full admin verification happens in the page/layout level with guards
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    // For now, just ensure user is authenticated
    // The actual super_admin check will be done in the admin layout/guards
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Images and other static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
