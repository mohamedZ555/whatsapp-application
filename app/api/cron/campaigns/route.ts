import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTemplateMessage } from '@/lib/whatsapp/api';
import { sleep, randomBetween } from '@/lib/utils';

export async function GET(req: NextRequest) {
  // Simple auth for cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: { scheduledAt: { lte: now }, status: 1 },
    include: { vendor: { select: { id: true, uid: true } } },
  });

  let processed = 0;
  for (const campaign of campaigns) {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 2 } });

    const settings = await prisma.vendorSetting.findMany({
      where: { vendorId: campaign.vendorId, settingKey: { in: ['whatsapp_access_token', 'current_phone_number_id'] } },
    });
    const accessToken = settings.find((s) => s.settingKey === 'whatsapp_access_token')?.settingValue;
    const phoneNumberId = settings.find((s) => s.settingKey === 'current_phone_number_id')?.settingValue;

    if (!accessToken || !phoneNumberId) {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 5 } });
      continue;
    }

    const queueItems = await prisma.whatsappMessageQueue.findMany({
      where: { campaignId: campaign.id, status: 1 },
      include: { contact: true },
      take: 50,
    });

    for (const item of queueItems) {
      await prisma.whatsappMessageQueue.update({ where: { id: item.id }, data: { status: 3 } });
      try {
        const campaignData = campaign.data as any;
        const response = await sendTemplateMessage(
          phoneNumberId,
          accessToken,
          item.contact.waId,
          campaignData?.templateName ?? '',
          campaignData?.languageCode ?? 'en',
          campaignData?.components
        );

        if (response?.messages?.[0]?.id) {
          await prisma.whatsappMessageQueue.update({ where: { id: item.id }, data: { status: 4 } });
          await prisma.whatsappMessageLog.create({
            data: {
              vendorId: campaign.vendorId,
              campaignId: campaign.id,
              contactId: item.contactId,
              messageType: 'template',
              status: 'sent',
              waMessageId: response.messages[0].id,
              wabPhoneNumberId: phoneNumberId,
            },
          });
          processed++;
        } else {
          const retries = item.retries + 1;
          await prisma.whatsappMessageQueue.update({
            where: { id: item.id },
            data: {
              status: retries >= item.maxRetries ? 2 : 1,
              retries,
              data: { process_response: { error_message: response?.error?.message } },
            },
          });
        }
      } catch (e: any) {
        await prisma.whatsappMessageQueue.update({
          where: { id: item.id },
          data: { status: 2, data: { process_response: { error_message: e.message } } },
        });
      }

      await sleep(randomBetween(1000, 3000));
    }

    // Check if all processed
    const remaining = await prisma.whatsappMessageQueue.count({
      where: { campaignId: campaign.id, status: { in: [1, 3] } },
    });
    if (remaining === 0) {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 3 } });
    }
  }

  return NextResponse.json({ success: true, processed });
}
