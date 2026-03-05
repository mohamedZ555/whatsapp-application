import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  getActorFromSession,
  isSuperAdmin,
  resolveOptionalVendorFilter,
  resolveRequiredVendorId,
} from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const searchParams = new URL(req.url).searchParams;
  const status = searchParams.get('status');
  const vendorId = resolveOptionalVendorFilter(actor, searchParams.get('vendorId'));
  if (!vendorId && !isSuperAdmin(actor)) return NextResponse.json([]);

  const where: Prisma.CampaignWhereInput = vendorId ? { vendorId } : {};
  if (status === 'upcoming') where.status = 1;
  else if (status === 'processing') where.status = 2;
  else if (status === 'executed') where.status = 3;
  else if (status === 'cancelled') where.status = 5;

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      template: { select: { templateName: true, languageCode: true, category: true } },
      _count: { select: { messageLogs: true, messageQueues: true } },
    },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const vendorId = resolveRequiredVendorId(actor, payload.vendorId);
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  // Campaigns are unlimited — no plan limit enforced

  const { name, templateId, scheduledAt, data, contactIds } = payload;
  if (!name) return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 });

  const campaign = await prisma.campaign.create({
    data: { vendorId, name, templateId: templateId ?? null, scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(), data: data ?? {} },
  });

  // Create queue entries
  if (contactIds?.length) {
    await prisma.whatsappMessageQueue.createMany({
      data: contactIds.map((cId: string) => ({
        vendorId,
        campaignId: campaign.id,
        contactId: cId,
        messageType: 'template',
        status: 1,
        scheduledAt: campaign.scheduledAt,
      })),
    });
  }

  return NextResponse.json({ success: true, data: campaign });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const id = typeof payload.id === 'string' ? payload.id : null;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const vendorId = resolveOptionalVendorFilter(actor, payload.vendorId);
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  }

  const existing = await prisma.campaign.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      name: payload.name ? String(payload.name) : undefined,
      templateId: payload.templateId !== undefined ? (payload.templateId ? String(payload.templateId) : null) : undefined,
      scheduledAt: payload.scheduledAt !== undefined ? (payload.scheduledAt ? new Date(payload.scheduledAt) : null) : undefined,
      status: typeof payload.status === 'number' ? payload.status : undefined,
      data: payload.data !== undefined ? payload.data : undefined,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const vendorId = resolveOptionalVendorFilter(actor, searchParams.get('vendorId'));
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  }

  const existing = await prisma.campaign.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await prisma.campaign.update({
    where: { id },
    data: { status: 5 },
  });

  return NextResponse.json({ success: true });
}
