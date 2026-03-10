/**
 * GET /api/chat/debug?contactId=xxx
 *
 * Development-only diagnostic endpoint.
 * Returns raw message counts and the last 10 messages (with isIncomingMessage)
 * so you can verify whether incoming messages are stored in the DB.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor) && !actor.vendorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const contactId = new URL(req.url).searchParams.get('contactId');
  if (!contactId) {
    // Return all contacts with message counts
    const contacts = await prisma.contact.findMany({
      where: actor.vendorId ? { vendorId: actor.vendorId } : {},
      select: {
        id: true, waId: true, firstName: true, lastName: true, vendorId: true,
        unreadMessagesCount: true, messagedAt: true,
        _count: { select: { messageLogs: true } },
      },
      orderBy: { messagedAt: { sort: 'desc', nulls: 'last' } },
      take: 20,
    });
    return NextResponse.json({ contacts });
  }

  const messages = await prisma.whatsappMessageLog.findMany({
    where: { contactId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true, messageType: true, messageContent: true,
      isIncomingMessage: true, status: true, waMessageId: true,
      createdAt: true,
    },
  });

  const totalIncoming = await prisma.whatsappMessageLog.count({
    where: { contactId, isIncomingMessage: true },
  });
  const totalOutgoing = await prisma.whatsappMessageLog.count({
    where: { contactId, isIncomingMessage: false },
  });

  return NextResponse.json({
    contactId,
    totalIncoming,
    totalOutgoing,
    last10: messages.reverse(),
  });
}
