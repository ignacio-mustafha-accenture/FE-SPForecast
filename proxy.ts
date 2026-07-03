import { NextResponse, type NextRequest } from 'next/server';

import { COOKIE_NAME } from '@/src/lib/constants';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = request.cookies.has(COOKIE_NAME);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hasCookie && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  if (hasCookie && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.delete('from');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
