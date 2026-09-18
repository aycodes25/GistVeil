import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, loadAdminConfig, verifySessionToken } from '@/lib/admin/session';

// Optimistic pre-filter for /admin/*: checks the cookie signature and expiry only (no
// database access). It is NOT the security boundary: Server Functions can escape a proxy
// matcher, so every admin page and action also calls verifyAdmin().

async function hasValidSession(request: NextRequest): Promise<boolean> {
  try {
    const { sessionSecret } = loadAdminConfig(process.env);
    return await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value, sessionSecret);
  } catch {
    return false; // missing or weak config: fail closed
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await hasValidSession(request);

  if (pathname === '/admin/login') {
    return authenticated
      ? NextResponse.redirect(new URL('/admin', request.nextUrl))
      : NextResponse.next();
  }

  if (authenticated) return NextResponse.next();

  // A download endpoint should answer 401, not send a script to an HTML login page.
  if (pathname.startsWith('/admin/export')) {
    return new NextResponse(null, { status: 401 });
  }

  return NextResponse.redirect(new URL('/admin/login', request.nextUrl));
}

export const config = {
  matcher: ['/admin/:path*'],
};
