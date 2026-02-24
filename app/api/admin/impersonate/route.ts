import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { encode } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';
import { USER_ROLES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const vendorId = typeof body.vendorId === 'string' ? body.vendorId : null;
  if (!vendorId) return NextResponse.json({ error: 'vendorId is required.' }, { status: 400 });

  // Find the vendor's admin user
  const adminUser = await prisma.user.findFirst({
    where: { vendorId, roleId: USER_ROLES.VENDOR, status: 1 },
    include: { vendorUserDetail: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!adminUser) {
    return NextResponse.json({ error: 'Active admin user not found for this vendor.' }, { status: 404 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { uid: true },
  });

  // Build the JWT token payload matching what the jwt callback produces
  const tokenPayload = {
    id: adminUser.id,
    uid: adminUser.uid,
    email: adminUser.email,
    name: `${adminUser.firstName ?? ''} ${adminUser.lastName ?? ''}`.trim(),
    roleId: adminUser.roleId,
    vendorId: adminUser.vendorId,
    vendorUid: vendor?.uid ?? null,
    permissions: (adminUser.vendorUserDetail?.permissions as string[]) ?? [],
    // next-auth internal fields
    sub: adminUser.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    jti: crypto.randomUUID(),
  };

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
  }

  const encodedToken = await encode({
    token: tokenPayload,
    secret,
    maxAge: 30 * 24 * 60 * 60,
  });

  // Determine correct cookie name based on environment
  const isSecure = process.env.NODE_ENV === 'production';
  const sessionCookieName = isSecure
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

  // Preserve the original super-admin session token so we can restore it later
  const originalToken = req.cookies.get(sessionCookieName)?.value;

  const response = NextResponse.json({ success: true });

  // Store original super-admin token in a separate cookie
  if (originalToken) {
    response.cookies.set('fadaa-sa-token', originalToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    });
  }

  // Mark session as impersonated (readable server-side via cookies())
  response.cookies.set('fadaa-impersonating', '1', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });

  // Replace session with vendor's token
  response.cookies.set(sessionCookieName, encodedToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
