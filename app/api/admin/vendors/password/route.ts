import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';
import { USER_ROLES } from '@/lib/constants';

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const vendorId = typeof body.vendorId === 'string' ? body.vendorId : null;
  const password = typeof body.password === 'string' ? body.password : null;

  if (!vendorId) return NextResponse.json({ error: 'vendorId is required.' }, { status: 400 });
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  // Find the admin user for this vendor
  const adminUser = await prisma.user.findFirst({
    where: { vendorId, roleId: USER_ROLES.VENDOR },
    select: { id: true },
  });

  if (!adminUser) {
    return NextResponse.json({ error: 'Admin user not found for this vendor.' }, { status: 404 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
