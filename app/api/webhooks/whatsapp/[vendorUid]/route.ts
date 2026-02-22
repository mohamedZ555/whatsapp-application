import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getPusherServer, PUSHER_EVENTS } from '@/lib/pusher';
import { sendTextMessage } from '@/lib/whatsapp/api';
import { processAiReply } from '@/lib/openai';

export async function GET(req: NextRequest, { params }: { params: Promise<{ vendorUid: string }> }) {
  const { vendorUid } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe') {
    const expected = crypto.createHash('sha1').update(vendorUid).digest('hex');
    if (token === expected) {
      return new NextResponse(challenge, { status: 200 });
    }
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ vendorUid: string }> }) {
  const { vendorUid } = await params;
  const body = await req.json();

  const vendor = await prisma.vendor.findUnique({ where: { uid: vendorUid } });
  if (!vendor) return new NextResponse('Not found', { status: 404 });

  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) return new NextResponse('OK', { status: 200 });

    // Handle incoming messages
    if (value.messages?.length) {
      for (const msg of value.messages) {
        const from = msg.from;
        const messageType = msg.type;
        let messageContent = '';

        if (messageType === 'text') messageContent = msg.text?.body ?? '';
        else if (messageType === 'interactive') {
          messageContent = msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? '';
        }

        // Find or create contact
        let contact = await prisma.contact.findUnique({
          where: { vendorId_waId: { vendorId: vendor.id, waId: from } },
        });

        if (!contact) {
          contact = await prisma.contact.create({
            data: { vendorId: vendor.id, waId: from, phoneNumber: from, status: 1 },
          });
        }

        // Create message log
        const log = await prisma.whatsappMessageLog.create({
          data: {
            vendorId: vendor.id,
            contactId: contact.id,
            messageType,
            messageContent: messageContent || null,
            status: 'received',
            isIncomingMessage: true,
            wabPhoneNumberId: value.metadata?.phone_number_id,
            waMessageId: msg.id,
            timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000) : null,
            data: { webhook_responses: { incoming: msg } },
          },
        });

        // Update contact
        await prisma.contact.update({
          where: { id: contact.id },
          data: { messagedAt: new Date(), unreadMessagesCount: { increment: 1 } },
        });

        // Broadcast via Pusher
        if (process.env.PUSHER_APP_ID) {
          try {
            await getPusherServer().trigger(
              `private-vendor-${vendorUid}`,
              PUSHER_EVENTS.NEW_MESSAGE,
              { log, contact }
            );
          } catch {}
        }

        // Process bot replies
        if (messageType === 'text' && messageContent) {
          await processBotReplies(vendor.id, contact, messageContent, value.metadata?.phone_number_id);
        }
      }
    }

    // Handle status updates
    if (value.statuses?.length) {
      for (const status of value.statuses) {
        await prisma.whatsappMessageLog.updateMany({
          where: { waMessageId: status.id, vendorId: vendor.id },
          data: {
            status: status.status,
            data: status.errors ? { webhook_responses: { failed: status } } : undefined,
          },
        });

        if (process.env.PUSHER_APP_ID) {
          try {
            await getPusherServer().trigger(
              `private-vendor-${vendorUid}`,
              PUSHER_EVENTS.MESSAGE_STATUS,
              { messageId: status.id, status: status.status }
            );
          } catch {}
        }
      }
    }
  } catch (e) {
    console.error('Webhook error:', e);
  }

  return new NextResponse('OK', { status: 200 });
}

async function processBotReplies(
  vendorId: string,
  contact: any,
  message: string,
  phoneNumberId?: string
) {
  const settings = await prisma.vendorSetting.findMany({
    where: { vendorId, settingKey: { in: ['whatsapp_access_token', 'current_phone_number_id'] } },
  });
  const accessToken = settings.find((s) => s.settingKey === 'whatsapp_access_token')?.settingValue;
  const pnId = phoneNumberId ?? settings.find((s) => s.settingKey === 'current_phone_number_id')?.settingValue;
  if (!accessToken || !pnId) return;

  const botReplies = await prisma.botReply.findMany({
    where: { vendorId, status: 1 },
    orderBy: { order: 'asc' },
  });

  const msg = message.toLowerCase().trim();

  for (const reply of botReplies) {
    let matched = false;
    const subject = reply.triggerSubject?.toLowerCase().trim() ?? '';

    switch (reply.triggerType) {
      case 'welcome':
        const count = await prisma.whatsappMessageLog.count({ where: { contactId: contact.id, isIncomingMessage: true } });
        matched = count <= 1;
        break;
      case 'is':
        matched = msg === subject;
        break;
      case 'starts_with':
        matched = msg.startsWith(subject);
        break;
      case 'ends_with':
        matched = msg.endsWith(subject);
        break;
      case 'contains_word':
        matched = msg.split(/\s+/).includes(subject);
        break;
      case 'contains':
        matched = msg.includes(subject);
        break;
      case 'stop_promotional':
        matched = msg === subject;
        break;
      case 'start_promotional':
        matched = msg === subject;
        break;
      case 'start_ai_bot':
        if (msg === subject) {
          await prisma.contact.update({ where: { id: contact.id }, data: { disableAiBot: false } });
        }
        break;
      case 'stop_ai_bot':
        if (msg === subject) {
          await prisma.contact.update({ where: { id: contact.id }, data: { disableAiBot: true } });
        }
        break;
    }

    if (matched && reply.replyMessage && reply.replyType === 'text') {
      const replyText = reply.replyMessage
        .replace(/{first_name}/g, contact.firstName ?? '')
        .replace(/{last_name}/g, contact.lastName ?? '')
        .replace(/{phone_number}/g, contact.waId ?? '')
        .replace(/{email}/g, contact.email ?? '');

      await sendTextMessage(pnId, accessToken, contact.waId, replyText);

      await prisma.whatsappMessageLog.create({
        data: {
          vendorId,
          contactId: contact.id,
          messageType: 'text',
          messageContent: replyText,
          status: 'sent',
          wabPhoneNumberId: pnId,
          isIncomingMessage: false,
        },
      });

      return; // Stop at first match
    }
  }

  // Try AI bot if no match
  if (!contact.disableAiBot) {
    try {
      const aiReply = await processAiReply(vendorId, contact.id, message);
      if (aiReply && pnId && accessToken) {
        await sendTextMessage(pnId, accessToken, contact.waId, aiReply);
        await prisma.whatsappMessageLog.create({
          data: {
            vendorId,
            contactId: contact.id,
            messageType: 'text',
            messageContent: aiReply,
            status: 'sent',
            wabPhoneNumberId: pnId,
            isIncomingMessage: false,
          },
        });
      }
    } catch {}
  }
}
