import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, getContactScope } from '@/lib/rbac';
import { markMessageAsRead } from '@/lib/whatsapp/api';

export async function GET(req: NextRequest, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { contactId } = await params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');
  // ?poll=1 is used by the client-side polling loop — skip read receipt to avoid
  // hammering the WhatsApp API and reduce response latency.
  const isPoll = url.searchParams.get('poll') === '1';

  const contact = await prisma.contact.findFirst({ where: { id: contactId, ...getContactScope(actor) } });
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Mark as read in DB (skip on polls — already cleared on first open)
  if (!isPoll) {
    await prisma.contact.update({ where: { id: contactId }, data: { unreadMessagesCount: 0 } });
  }

  const messages = await prisma.whatsappMessageLog.findMany({
    where: { contactId, vendorId: contact.vendorId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  // Send WhatsApp read receipt for the latest unread incoming message (skip on polls)
  // (WhatsApp only needs the last message marked as read — it marks all prior as read too)
  const latestIncoming = isPoll ? null : messages.find((m) => m.isIncomingMessage && m.waMessageId);
  if (latestIncoming?.waMessageId) {
    try {
      const settings = await prisma.vendorSetting.findMany({
        where: {
          vendorId: contact.vendorId,
          settingKey: { in: ['whatsapp_access_token', 'whatsapp_phone_number_id', 'current_phone_number_id'] },
        },
      });
      const accessToken = settings.find((s) => s.settingKey === 'whatsapp_access_token')?.settingValue;
      const phoneNumberId =
        settings.find((s) => s.settingKey === 'current_phone_number_id')?.settingValue ??
        settings.find((s) => s.settingKey === 'whatsapp_phone_number_id')?.settingValue ??
        latestIncoming.wabPhoneNumberId;

      if (accessToken && phoneNumberId) {
        await markMessageAsRead(phoneNumberId, accessToken, latestIncoming.waMessageId).catch(() => {});
      }
    } catch {
      // Non-critical — don't fail the request if read receipt fails
    }
  }

  return NextResponse.json({ messages: messages.reverse(), contact });
}
