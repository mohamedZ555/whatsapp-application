import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = isSuperAdmin(actor)
    ? new URL(req.url).searchParams.get('vendorId')
    : actor.vendorId;

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
  const vendorId = isSuperAdmin(actor) ? (body.vendorId ?? actor.vendorId) : actor.vendorId;
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  const { name, color } = body;

  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const label = await prisma.label.create({
    data: { vendorId, name, color: color ?? '#6c757d' },
  });
  return NextResponse.json({ success: true, data: label });
}
