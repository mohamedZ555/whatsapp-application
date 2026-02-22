import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { routing } from '@/i18n/routing';
import { USER_ROLES } from '@/lib/constants';
import { canAccessVendorPath } from '@/lib/access';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  if (intlResponse && intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const { pathname } = request.nextUrl;
  const localeMatch = pathname.match(/^\/(en|ar)(?=\/|$)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
  const withLocale = (path: string) => `/${locale}${path}`;

  const isDashboardRoute =
    pathWithoutLocale.startsWith('/dashboard') ||
    pathWithoutLocale.match(
      /^\/(contacts|chat|campaigns|templates|bot-replies|message-log|users|subscription|settings)/,
    );
  const isAdminRoute = pathWithoutLocale.startsWith('/admin');
  const isAuthPage = pathWithoutLocale === '/login' || pathWithoutLocale === '/register';

  if (!isDashboardRoute && !isAdminRoute && !isAuthPage) {
    return intlResponse ?? NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const roleId = token?.roleId as number | undefined;
  const permissions = token?.permissions as string[] | undefined;

  if (isDashboardRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL(withLocale('/login'), request.url));
    }
    if (roleId !== USER_ROLES.SUPER_ADMIN && roleId !== USER_ROLES.VENDOR && roleId !== USER_ROLES.VENDOR_USER) {
      return NextResponse.redirect(new URL(withLocale('/login'), request.url));
    }
    if (!canAccessVendorPath(pathWithoutLocale, roleId, permissions)) {
      return NextResponse.redirect(new URL(withLocale('/dashboard'), request.url));
    }
  }

  if (isAdminRoute) {
    if (!isAuthenticated || roleId !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.redirect(new URL(withLocale('/login'), request.url));
    }
  }

  if (isAuthenticated && isAuthPage) {
    if (roleId === USER_ROLES.SUPER_ADMIN) {
      return NextResponse.redirect(new URL(withLocale('/admin'), request.url));
    }
    return NextResponse.redirect(new URL(withLocale('/dashboard'), request.url));
  }

  return intlResponse ?? NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
