import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;
  const { contactId } = await params;
  const cursor = new URL(req.url).searchParams.get('cursor');

  const contact = await prisma.contact.findFirst({ where: { id: contactId, vendorId } });
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Mark as read
  await prisma.contact.update({ where: { id: contactId }, data: { unreadMessagesCount: 0 } });

  const messages = await prisma.whatsappMessageLog.findMany({
    where: { contactId, vendorId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return NextResponse.json({ messages: messages.reverse(), contact });
}
