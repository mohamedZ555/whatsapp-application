import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const isSecure = process.env.NODE_ENV === 'production';
  const sessionCookieName = isSecure
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

  const originalToken = req.cookies.get('fadaa-sa-token')?.value;

  if (!originalToken) {
    // No saved token — just redirect to admin panel
    return NextResponse.redirect(new URL('/admin/vendors', req.url));
  }

  const response = NextResponse.redirect(new URL('/admin/vendors', req.url));

  // Restore the original super-admin session
  response.cookies.set(sessionCookieName, originalToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  // Clear impersonation cookies
  response.cookies.set('fadaa-sa-token', '', { path: '/', maxAge: 0 });
  response.cookies.set('fadaa-impersonating', '', { path: '/', maxAge: 0 });

  return response;
}
