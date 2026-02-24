import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  getActorFromSession,
  isSuperAdmin,
  resolveOptionalVendorFilter,
  resolveRequiredVendorId,
} from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = resolveOptionalVendorFilter(actor, new URL(req.url).searchParams.get('vendorId'));
  if (!vendorId && !isSuperAdmin(actor)) return NextResponse.json([]);

  const labels = await prisma.label.findMany({
    where: { ...(vendorId ? { vendorId } : {}), status: 1 },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(labels);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const vendorId = resolveRequiredVendorId(actor, body.vendorId);
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  const { name, color } = body;

  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const label = await prisma.label.create({
    data: { vendorId, name, color: color ?? '#6c757d' },
  });
  return NextResponse.json({ success: true, data: label });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const vendorId = resolveOptionalVendorFilter(actor, body.vendorId);
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  }

  const existing = await prisma.label.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const updated = await prisma.label.update({
    where: { id },
    data: {
      name: body.name ? String(body.name) : undefined,
      color: body.color !== undefined ? (body.color ? String(body.color) : '#6c757d') : undefined,
      status: typeof body.status === 'number' ? body.status : undefined,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const vendorId = resolveOptionalVendorFilter(actor, searchParams.get('vendorId'));
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  }

  const existing = await prisma.label.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await prisma.label.update({
    where: { id },
    data: { status: 5 },
  });

  return NextResponse.json({ success: true });
}
