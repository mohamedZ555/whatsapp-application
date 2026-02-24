import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 25)));

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
          { uid: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { roleId: 2 },
          take: 1,
          select: { id: true, firstName: true, lastName: true, email: true, username: true, status: true },
        },
        subscriptions: { where: { status: 'active' }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return NextResponse.json({ vendors, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!title) return NextResponse.json({ error: 'Vendor title is required.' }, { status: 400 });
  if (!firstName) return NextResponse.json({ error: 'First name is required.' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  if (!username) return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

  // Check uniqueness
  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (existingEmail) return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
  if (existingUsername) return NextResponse.json({ error: 'Username already in use.' }, { status: 400 });

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Ensure slug uniqueness by appending a random suffix if needed
  const slugExists = await prisma.vendor.findUnique({ where: { slug }, select: { id: true } });
  const finalSlug = slugExists ? `${slug}-${Math.random().toString(36).slice(2, 7)}` : slug;

  const hashedPassword = await bcrypt.hash(password, 10);

  const vendor = await prisma.vendor.create({
    data: {
      title,
      slug: finalSlug,
      status: 1,
      users: {
        create: {
          firstName,
          lastName: lastName || '',
          email,
          username,
          password: hashedPassword,
          roleId: USER_ROLES.VENDOR,
          status: 1,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: { id: vendor.id } });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const existing = await prisma.vendor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      title: body.title !== undefined ? String(body.title) : undefined,
      status: typeof body.status === 'number' ? body.status : undefined,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const existing = await prisma.vendor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });

  // Soft delete: set status to 0
  await prisma.vendor.update({
    where: { id },
    data: { status: 0 },
  });

  return NextResponse.json({ success: true });
}
