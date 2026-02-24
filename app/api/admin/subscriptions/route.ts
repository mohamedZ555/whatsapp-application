import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';
import { PLANS } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 25)));

  const where = search
    ? {
        vendor: {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            { uid: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }
    : {};

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { vendor: { select: { id: true, title: true, slug: true, uid: true } } },
    }),
    prisma.subscription.count({ where }),
  ]);

  return NextResponse.json({ subscriptions, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const vendorId = typeof body.vendorId === 'string' ? body.vendorId : null;
  const planId = typeof body.planId === 'string' ? body.planId : null;
  const billingCycle: 'monthly' | 'yearly' = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';

  if (!vendorId) return NextResponse.json({ error: 'vendorId is required.' }, { status: 400 });
  if (!planId || !(planId in PLANS)) return NextResponse.json({ error: 'Invalid planId.' }, { status: 400 });

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
  if (!vendor) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });

  // Expire any current active subscriptions
  await prisma.subscription.updateMany({
    where: { vendorId, status: 'active' },
    data: { status: 'expired', endsAt: new Date() },
  });

  const now = new Date();
  const endsAt = new Date(now);
  if (billingCycle === 'yearly') {
    endsAt.setFullYear(endsAt.getFullYear() + 1);
  } else {
    endsAt.setMonth(endsAt.getMonth() + 1);
  }

  const subscription = await prisma.subscription.create({
    data: { vendorId, planId, status: 'active', startsAt: now, endsAt },
    include: { vendor: { select: { id: true, title: true, slug: true, uid: true } } },
  });

  return NextResponse.json({ success: true, data: subscription });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const existing = await prisma.subscription.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.planId === 'string' && body.planId in PLANS) data.planId = body.planId;
  if (typeof body.status === 'string') data.status = body.status;
  if (body.startsAt) data.startsAt = new Date(body.startsAt);
  if (body.endsAt) data.endsAt = new Date(body.endsAt);

  const updated = await prisma.subscription.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const existing = await prisma.subscription.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });

  await prisma.subscription.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
