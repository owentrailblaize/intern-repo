import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get user session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl.clone();

  // Redirect /portal to /workspace (permanent redirect)
  if (url.pathname === '/portal' || url.pathname.startsWith('/portal/')) {
    url.pathname = url.pathname.replace('/portal', '/workspace');
    return NextResponse.redirect(url, 301);
  }

  // Protect /workspace routes - require authentication
  if (url.pathname === '/workspace' || url.pathname.startsWith('/workspace/')) {
    if (!session) {
      // Redirect to landing page with signin parameter
      url.pathname = '/';
      url.searchParams.set('signin', 'required');
      return NextResponse.redirect(url);
    }
  }

  // Protect /nucleus routes - require authentication AND admin role
  if (url.pathname === '/nucleus' || url.pathname.startsWith('/nucleus/')) {
    if (!session) {
      // Redirect unauthenticated users to landing page
      url.pathname = '/';
      url.searchParams.set('signin', 'required');
      return NextResponse.redirect(url);
    }

    // Check user role from JWT metadata
    const userRole = session.user?.user_metadata?.role;
    const isAdmin = userRole === 'founder' || userRole === 'cofounder';

    if (!isAdmin) {
      // Redirect non-admin users to their workspace
      url.pathname = '/workspace';
      url.searchParams.set('access', 'denied');
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from landing page to workspace
  if (url.pathname === '/' && session) {
    url.pathname = '/workspace';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    '/',
    '/portal/:path*',
    '/workspace/:path*',
    '/nucleus/:path*',
  ],
};
