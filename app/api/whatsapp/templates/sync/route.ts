import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getTemplates } from '@/lib/whatsapp/api';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const vendorId = isSuperAdmin(actor) ? (body.vendorId ?? actor.vendorId) : actor.vendorId;
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  const settings = await prisma.vendorSetting.findMany({
    where: { vendorId, settingKey: { in: ['whatsapp_access_token', 'whatsapp_business_account_id'] } },
  });
  const accessToken = settings.find((s) => s.settingKey === 'whatsapp_access_token')?.settingValue;
  const wabaid = settings.find((s) => s.settingKey === 'whatsapp_business_account_id')?.settingValue;

  if (!accessToken || !wabaid) {
    return NextResponse.json({ error: 'WhatsApp not configured.' }, { status: 400 });
  }

  const result = await getTemplates(wabaid, accessToken);
  if (!result.data) return NextResponse.json({ error: 'Failed to fetch templates from WhatsApp.' }, { status: 400 });

  let synced = 0;
  for (const t of result.data) {
    await prisma.whatsappTemplate.upsert({
      where: { uid: t.id ?? '' },
      update: { templateStatus: t.status, data: t, updatedAt: new Date() },
      create: {
        uid: t.id ?? '',
        vendorId,
        templateName: t.name,
        templateStatus: t.status,
        languageCode: t.language ?? 'en',
        category: t.category ?? 'MARKETING',
        data: t,
      },
    });
    synced++;
  }

  return NextResponse.json({ success: true, synced });
}
