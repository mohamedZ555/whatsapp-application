import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;

  const templates = await prisma.whatsappTemplate.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(templates);
}
