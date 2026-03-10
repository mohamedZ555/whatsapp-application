import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, getContactScope } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const selectedVendorId = searchParams.get('vendorId') ?? undefined;
  const chatFilter = searchParams.get('chatFilter') ?? 'all';

  const where: any = { ...getContactScope(actor, selectedVendorId), status: { not: 5 } };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { waId: { contains: search } },
    ];
  }

  if (chatFilter === 'unread') {
    where.unreadMessagesCount = { gt: 0 };
  } else if (chatFilter === 'mine') {
    where.assignedUserId = actor.userId;
  } else if (chatFilter === 'unassigned') {
    where.assignedUserId = null;
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ messagedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: 50,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      waId: true,
      phoneNumber: true,
      status: true,
      messagedAt: true,
      unreadMessagesCount: true,
      assignedUserId: true,
      vendorId: true,
      messageLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { messageContent: true, messageType: true, createdAt: true, isIncomingMessage: true },
      },
      labels: {
        select: { label: { select: { name: true, color: true } } },
      },
    },
  });
  return NextResponse.json(contacts);
}
