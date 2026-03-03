import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin, resolveOptionalVendorFilter, resolveRequiredVendorId } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = resolveOptionalVendorFilter(actor, new URL(req.url).searchParams.get('vendorId'));
  if (!vendorId && !isSuperAdmin(actor)) return NextResponse.json([]);

  const templates = await prisma.whatsappTemplate.findMany({
    where: vendorId ? { vendorId } : {},
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const vendorId = resolveRequiredVendorId(actor, body.vendorId);
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  const { name, language, category, components } = body;
  if (!name || !language || !category) {
    return NextResponse.json({ error: 'name, language, category are required.' }, { status: 400 });
  }

  // Get WhatsApp settings
  const settings = await prisma.vendorSetting.findMany({
    where: { vendorId, settingKey: { in: ['whatsapp_access_token', 'whatsapp_business_account_id'] } },
  });
  const accessToken = settings.find((s) => s.settingKey === 'whatsapp_access_token')?.settingValue;
  const wabaid = settings.find((s) => s.settingKey === 'whatsapp_business_account_id')?.settingValue;

  if (!accessToken || !wabaid) {
    return NextResponse.json({ error: 'WhatsApp not configured.' }, { status: 400 });
  }

  // Call WhatsApp API to create template
  const waRes = await fetch(`https://graph.facebook.com/v22.0/${wabaid}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, language, category, components: components ?? [] }),
  });
  const waData = await waRes.json();

  if (waData.error) {
    return NextResponse.json({ error: waData.error.message ?? 'WhatsApp API error.' }, { status: 400 });
  }

  // Save to DB
  const template = await prisma.whatsappTemplate.upsert({
    where: { uid: waData.id ?? name },
    update: { templateStatus: waData.status ?? 'PENDING', data: waData, updatedAt: new Date() },
    create: {
      uid: waData.id ?? name,
      vendorId,
      templateName: name,
      templateStatus: waData.status ?? 'PENDING',
      languageCode: language,
      category,
      data: { ...waData, components },
    },
  });

  return NextResponse.json({ success: true, data: template });
}
