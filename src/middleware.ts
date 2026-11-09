import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'mozaid_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mozaid-super-secure-production-secret-key-2026-yemen'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let sessionUser: { role?: string; id?: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionUser = {
        id: payload.id as string,
        role: payload.role as string,
      };
    } catch {
      sessionUser = null;
    }
  }

  const isAdmin = sessionUser?.role === 'admin';
  const isAuthenticated = !!sessionUser;

  // 1. حماية مسارات الإدارة العليا /admin/*
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'login_required');
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdmin) {
      const homeUrl = new URL('/', request.url);
      homeUrl.searchParams.set('error', 'unauthorized_admin');
      return NextResponse.redirect(homeUrl);
    }
  }

  // 2. حماية المسارات التي تتطلب حساباً مسجلاً (المحفظة، إنشاء مزاد، إنشاء مناقصة)
  const protectedUserRoutes = ['/wallet', '/auctions/create', '/tenders/create'];
  const isProtectedUserRoute = protectedUserRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedUserRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. إذا كان مسجلاً بالفعل وزار صفحة الدخول أو التسجيل
  if ((pathname === '/login' || pathname === '/register') && isAuthenticated) {
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/wallet/:path*',
    '/auctions/create',
    '/tenders/create',
    '/login',
    '/register',
  ],
};
