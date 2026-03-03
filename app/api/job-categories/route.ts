import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, hasVendorPermission, isSuperAdmin, isVendorAdmin, resolveRequiredVendorId } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isVendorAdmin(actor) && !hasVendorPermission(actor, 'manage_users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const vendorIdParam = searchParams.get('vendorId') ?? undefined;
  const vendorId = resolveRequiredVendorId(actor, vendorIdParam);
  if (!vendorId) return NextResponse.json({ error: 'Vendor required' }, { status: 403 });

  const categories = await prisma.employeeJobCategory.findMany({
    where: { vendorId, status: { not: 5 } },
    orderBy: { createdAt: 'asc' },
    include: {
      employees: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
        },
      },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isVendorAdmin(actor) && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (isVendorAdmin(actor) && !hasVendorPermission(actor, 'manage_users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const vendorId = resolveRequiredVendorId(actor, body.vendorId);
  if (!vendorId) return NextResponse.json({ error: 'Vendor required' }, { status: 403 });

  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const category = await prisma.employeeJobCategory.create({
    data: {
      vendorId,
      name,
      description: body.description ? String(body.description).trim() : null,
      color: body.color ? String(body.color) : '#6c757d',
    },
  });

  return NextResponse.json({ success: true, category });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isVendorAdmin(actor) && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (isVendorAdmin(actor) && !hasVendorPermission(actor, 'manage_users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, description, color } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const vendorId = resolveRequiredVendorId(actor, body.vendorId);
  const existing = await prisma.employeeJobCategory.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.employeeJobCategory.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
      ...(color !== undefined ? { color: String(color) } : {}),
    },
  });

  return NextResponse.json({ success: true, category: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isVendorAdmin(actor) && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (isVendorAdmin(actor) && !hasVendorPermission(actor, 'manage_users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const vendorId = resolveRequiredVendorId(actor, searchParams.get('vendorId') ?? undefined);
  const existing = await prisma.employeeJobCategory.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Unlink employees and bot flows before deleting
  await Promise.all([
    prisma.vendorUser.updateMany({ where: { jobCategoryId: id }, data: { jobCategoryId: null } }),
    prisma.botFlow.updateMany({ where: { jobCategoryId: id }, data: { jobCategoryId: null } }),
  ]);

  await prisma.employeeJobCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
