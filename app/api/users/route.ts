import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';
import { checkLimit } from '@/lib/permissions';
import { canManageVendorUsers, getActorFromSession, isSuperAdmin, isVendorAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchParams = new URL(req.url).searchParams;
  const vendorIdParam = searchParams.get('vendorId');
  const roleParam = searchParams.get('roleId');

  let vendorIdFilter: string | undefined;
  if (isSuperAdmin(actor)) {
    vendorIdFilter = vendorIdParam ?? undefined;
  } else if (isVendorAdmin(actor)) {
    vendorIdFilter = actor.vendorId ?? undefined;
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const roleId = roleParam ? parseInt(roleParam, 10) : undefined;
  const where: any = {
    ...(vendorIdFilter ? { vendorId: vendorIdFilter } : {}),
    ...(roleId ? { roleId } : {}),
    status: { not: 5 },
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      role: { select: { id: true, title: true } },
      vendor: { select: { id: true, title: true, uid: true } },
      vendorUserDetail: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    firstName,
    lastName,
    username,
    email,
    mobileNumber,
    password,
    roleId,
    vendorId: requestedVendorId,
    vendorTitle,
    permissions,
  } = body ?? {};

  if (!firstName || !lastName || !username || !email || !password || !roleId) {
    return NextResponse.json({ error: 'Required fields are missing.' }, { status: 400 });
  }

  const parsedRoleId = Number(roleId);
  if (parsedRoleId !== USER_ROLES.VENDOR && parsedRoleId !== USER_ROLES.VENDOR_USER) {
    return NextResponse.json({ error: 'Invalid target role.' }, { status: 400 });
  }

  if (!isSuperAdmin(actor) && !isVendorAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (isVendorAdmin(actor) && parsedRoleId !== USER_ROLES.VENDOR_USER) {
    return NextResponse.json({ error: 'Admin can only create employee users.' }, { status: 403 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: String(email).toLowerCase() }, { username: String(username).toLowerCase() }] },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: 'Email or username already in use.' }, { status: 409 });
  }

  let finalVendorId: string | null = null;
  if (parsedRoleId === USER_ROLES.VENDOR) {
    if (!isSuperAdmin(actor)) {
      return NextResponse.json({ error: 'Only super admin can create admin accounts.' }, { status: 403 });
    }
    const vendor = await prisma.vendor.create({
      data: { title: vendorTitle ?? `${firstName} ${lastName} Workspace`, status: 1 },
    });
    finalVendorId = vendor.id;

    await prisma.subscription.create({
      data: { vendorId: vendor.id, planId: 'free', status: 'active' },
    });
  } else {
    finalVendorId = requestedVendorId ?? actor.vendorId;
    if (!finalVendorId) {
      return NextResponse.json({ error: 'Target vendor is required.' }, { status: 400 });
    }
    if (!canManageVendorUsers(actor, finalVendorId)) {
      return NextResponse.json({ error: 'Forbidden for this vendor.' }, { status: 403 });
    }

    const canAdd = await checkLimit(finalVendorId, 'teamMembers');
    if (!canAdd) {
      return NextResponse.json({ error: 'Team member limit reached for subscription.' }, { status: 403 });
    }
  }

  const hashed = await bcrypt.hash(String(password), 12);
  const user = await prisma.user.create({
    data: {
      firstName: String(firstName),
      lastName: String(lastName),
      username: String(username).toLowerCase(),
      email: String(email).toLowerCase(),
      mobileNumber: mobileNumber ? String(mobileNumber) : null,
      password: hashed,
      roleId: parsedRoleId,
      vendorId: finalVendorId,
      status: 1,
    },
  });

  if (parsedRoleId === USER_ROLES.VENDOR_USER && finalVendorId) {
    await prisma.vendorUser.create({
      data: {
        vendorId: finalVendorId,
        userId: user.id,
        permissions: Array.isArray(permissions) ? permissions : [],
      },
    });
  }

  return NextResponse.json({ success: true, data: user });
}
