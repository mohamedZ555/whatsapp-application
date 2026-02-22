import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;

  const labels = await prisma.label.findMany({
    where: { vendorId, status: 1 },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(labels);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;
  const { name, color } = await req.json();

  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const label = await prisma.label.create({
    data: { vendorId, name, color: color ?? '#6c757d' },
  });
  return NextResponse.json({ success: true, data: label });
}
