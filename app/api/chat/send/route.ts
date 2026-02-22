import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendTextMessage, sendMediaMessage } from '@/lib/whatsapp/api';
import { getPusherServer, PUSHER_EVENTS } from '@/lib/pusher';
import { getActorFromSession, getContactScope } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contactId, messageType, messageContent, mediaData } = await req.json();

  const contact = await prisma.contact.findFirst({ where: { id: contactId, ...getContactScope(actor) } });
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  const vendorId = contact.vendorId;

  // Get vendor WhatsApp settings
  const settings = await prisma.vendorSetting.findMany({
    where: { vendorId, settingKey: { in: ['whatsapp_access_token', 'current_phone_number_id'] } },
  });
  const accessToken = settings.find((s) => s.settingKey === 'whatsapp_access_token')?.settingValue;
  const phoneNumberId = settings.find((s) => s.settingKey === 'current_phone_number_id')?.settingValue;

  if (!accessToken || !phoneNumberId) {
    return NextResponse.json({ error: 'WhatsApp not configured.' }, { status: 400 });
  }

  let response: any;
  if (messageType === 'text') {
    response = await sendTextMessage(phoneNumberId, accessToken, contact.waId, messageContent);
  } else if (mediaData) {
    response = await sendMediaMessage(phoneNumberId, accessToken, contact.waId, mediaData.type, mediaData.url, mediaData.caption);
  }

  if (response?.error) {
    return NextResponse.json({ error: response.error.message }, { status: 400 });
  }

  const log = await prisma.whatsappMessageLog.create({
    data: {
      vendorId,
      contactId,
      messageType: messageType ?? 'text',
      messageContent: messageContent ?? null,
      status: 'sent',
      waMessageId: response?.messages?.[0]?.id ?? null,
      wabPhoneNumberId: phoneNumberId,
      data: mediaData ? { media_values: mediaData } : undefined,
    },
  });

  await prisma.contact.update({ where: { id: contactId }, data: { messagedAt: new Date() } });

  // Broadcast via Pusher
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { uid: true } });
  if (vendor && process.env.PUSHER_APP_ID) {
    try {
      await getPusherServer().trigger(`private-vendor-${vendor.uid}`, PUSHER_EVENTS.NEW_MESSAGE, { log });
    } catch {}
  }

  return NextResponse.json({ success: true, data: log });
}
