import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Redirect /portal to /workspace (permanent redirect)
  // This handles the legacy route migration
  if (url.pathname === '/portal' || url.pathname.startsWith('/portal/')) {
    url.pathname = url.pathname.replace('/portal', '/workspace');
    return NextResponse.redirect(url, 301);
  }

  // Note: Authentication checks for /workspace and /nucleus are handled
  // by their respective layout.tsx files using ProtectedRoute component
  // and the AuthProvider context. This keeps auth logic centralized
  // and avoids duplicating Supabase client setup in middleware.

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/portal/:path*',
  ],
};
