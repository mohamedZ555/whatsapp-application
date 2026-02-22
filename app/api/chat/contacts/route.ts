import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;
  const search = new URL(req.url).searchParams.get('search') ?? '';

  const where: any = { vendorId, status: { not: 5 } };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { waId: { contains: search } },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ messagedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: 50,
    include: {
      messageLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { messageContent: true, messageType: true, createdAt: true, isIncomingMessage: true },
      },
      labels: { include: { label: { select: { name: true, color: true } } } },
    },
  });
  return NextResponse.json(contacts);
}
