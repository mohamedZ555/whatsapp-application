import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getPusherServer, PUSHER_EVENTS } from '@/lib/pusher';
import { processBotAutomation } from '@/lib/bot-flow-engine';
import { getVendorOwnerUserId } from '@/lib/rbac';

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
        let logData: Record<string, unknown> = { webhook_responses: { incoming: msg } };

        if (messageType === 'text') {
          messageContent = msg.text?.body ?? '';
        } else if (messageType === 'interactive') {
          messageContent = msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? '';
        } else if (messageType === 'image' && msg.image) {
          messageContent = msg.image.caption ?? null;
          logData = { mediaId: msg.image.id, fileName: msg.image.filename ?? null, caption: msg.image.caption ?? null, ...logData };
        } else if (messageType === 'video' && msg.video) {
          messageContent = msg.video.caption ?? null;
          logData = { mediaId: msg.video.id, fileName: msg.video.filename ?? null, caption: msg.video.caption ?? null, ...logData };
        } else if (messageType === 'audio' && msg.audio) {
          logData = { mediaId: msg.audio.id, fileName: msg.audio.filename ?? 'audio', ...logData };
        } else if (messageType === 'document' && msg.document) {
          messageContent = msg.document.caption ?? null;
          logData = { mediaId: msg.document.id, fileName: msg.document.filename ?? null, caption: msg.document.caption ?? null, ...logData };
        }

        // Find or create contact
        let contact = await prisma.contact.findUnique({
          where: { vendorId_waId: { vendorId: vendor.id, waId: from } },
        });

        if (!contact) {
          const ownerId = await getVendorOwnerUserId(vendor.id);
          contact = await prisma.contact.create({
            data: {
              vendorId: vendor.id,
              waId: from,
              phoneNumber: from,
              status: 1,
              assignedUserId: ownerId,
            },
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
            data: logData,
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
        if (messageContent) {
          const replyChoiceKey = msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id ?? null;
          await processBotAutomation(
            vendor.id,
            contact,
            messageContent,
            replyChoiceKey,
            value.metadata?.phone_number_id
          );
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
              { waMessageId: status.id, status: status.status }
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
