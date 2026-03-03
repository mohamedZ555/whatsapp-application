import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, resolveOptionalVendorFilter } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const vendorId = resolveOptionalVendorFilter(actor, null);
  const template = await prisma.whatsappTemplate.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
  });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const vendorId = resolveOptionalVendorFilter(actor, null);
  const template = await prisma.whatsappTemplate.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
  });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { components, category } = body;

  // Get WhatsApp settings
  const settings = await prisma.vendorSetting.findMany({
    where: { vendorId: template.vendorId, settingKey: { in: ['whatsapp_access_token', 'whatsapp_business_account_id'] } },
  });
  const accessToken = settings.find((s) => s.settingKey === 'whatsapp_access_token')?.settingValue;
  const wabaid = settings.find((s) => s.settingKey === 'whatsapp_business_account_id')?.settingValue;

  if (!accessToken || !wabaid) {
    return NextResponse.json({ error: 'WhatsApp not configured.' }, { status: 400 });
  }

  // Update via WhatsApp API using the template uid
  const waRes = await fetch(`https://graph.facebook.com/v22.0/${template.uid}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ components, category }),
  });
  const waData = await waRes.json();

  if (waData.error) {
    return NextResponse.json({ error: waData.error.message ?? 'WhatsApp API error.' }, { status: 400 });
  }

  const updated = await prisma.whatsappTemplate.update({
    where: { id },
    data: {
      category: category ?? template.category,
      data: { ...(template.data as object ?? {}), components },
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const vendorId = resolveOptionalVendorFilter(actor, null);
  const template = await prisma.whatsappTemplate.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
  });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get WhatsApp settings
  const settings = await prisma.vendorSetting.findMany({
    where: { vendorId: template.vendorId, settingKey: { in: ['whatsapp_access_token', 'whatsapp_business_account_id'] } },
  });
  const accessToken = settings.find((s) => s.settingKey === 'whatsapp_access_token')?.settingValue;
  const wabaid = settings.find((s) => s.settingKey === 'whatsapp_business_account_id')?.settingValue;

  if (accessToken && wabaid && template.templateName) {
    // Delete from WhatsApp by name (best effort)
    await fetch(
      `https://graph.facebook.com/v22.0/${wabaid}/message_templates?hsm_id=${template.uid}&name=${template.templateName}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    ).catch(() => null);
  }

  await prisma.whatsappTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
