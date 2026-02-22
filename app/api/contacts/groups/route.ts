import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;

  const groups = await prisma.contactGroup.findMany({
    where: { vendorId, status: { not: 5 } },
    orderBy: { name: 'asc' },
    include: { _count: { select: { contacts: true } } },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;
  const { name, description, color } = await req.json();

  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const group = await prisma.contactGroup.create({
    data: { vendorId, name, description: description ?? null, color: color ?? '#6c757d' },
  });
  return NextResponse.json({ success: true, data: group });
}
