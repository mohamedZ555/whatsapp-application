import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
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

  console.log('Webhook: Received POST for vendorUid:', vendorUid);

  const vendor = await prisma.vendor.findUnique({ where: { uid: vendorUid } });
  if (!vendor) {
    console.warn('Webhook: Vendor not found for uid:', vendorUid);
    return new NextResponse('Not found', { status: 404 });
  }

  console.log('Webhook: Found vendor:', { id: vendor.id, uid: vendor.uid });

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
        } else if (messageType === 'button') {
          messageContent = msg.button?.text ?? '';
        }

        // Upsert contact (create if new, otherwise fetch existing)
        const ownerId = await getVendorOwnerUserId(vendor.id);
        const contact = await prisma.contact.upsert({
          where: { vendorId_waId: { vendorId: vendor.id, waId: from } },
          create: {
            vendorId: vendor.id,
            waId: from,
            phoneNumber: from,
            status: 1,
            assignedUserId: ownerId,
            messagedAt: new Date(),
            unreadMessagesCount: 1,
          },
          update: {
            messagedAt: new Date(),
            unreadMessagesCount: { increment: 1 },
          },
        });

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
            data: logData as Prisma.InputJsonValue,
          },
        });

        // Broadcast via Pusher
        if (process.env.PUSHER_APP_ID) {
          try {
            // Send lean payload to avoid Pusher's 10KB limit
            // Strip webhook_responses (can be very large for media messages)
            const { data: logData, ...logRest } = log;
            const leanData = logData && typeof logData === 'object' && !Array.isArray(logData)
              ? (() => { const { webhook_responses, ...rest } = logData as Record<string, unknown>; return Object.keys(rest).length ? rest : undefined; })()
              : logData;
            const pusherLog = { ...logRest, ...(leanData !== undefined && { data: leanData }) };

            console.log('Webhook: Triggering NEW_MESSAGE via Pusher', {
              channel: `private-vendor-${vendorUid}`,
              contactId: contact.id,
              logId: log.id
            });
            await getPusherServer().trigger(
               `private-vendor-${vendorUid}`,
               PUSHER_EVENTS.NEW_MESSAGE,
               { log: pusherLog, contact }
             );

             // Also trigger contact update to refresh the sidebar
             await getPusherServer().trigger(
               `private-vendor-${vendorUid}`,
               PUSHER_EVENTS.CONTACT_UPDATE,
               {}
             );
           } catch (err) {
            console.error('Webhook: Pusher trigger error:', err);
          }
        } else {
          console.warn('Webhook: PUSHER_APP_ID not found, skipping broadcast');
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
