import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkLimit } from '@/lib/permissions';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const searchParams = new URL(req.url).searchParams;
  const status = searchParams.get('status');
  const vendorId = isSuperAdmin(actor) ? searchParams.get('vendorId') : actor.vendorId;

  const where: any = vendorId ? { vendorId } : {};
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
  const vendorId = isSuperAdmin(actor) ? (payload.vendorId ?? actor.vendorId) : actor.vendorId;
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  const canCreate = await checkLimit(vendorId, 'campaignsPerMonth');
  if (!canCreate) return NextResponse.json({ error: 'Campaign limit reached. Please upgrade.' }, { status: 403 });

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
