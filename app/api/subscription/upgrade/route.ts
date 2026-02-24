import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';
import { PLANS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const planId = typeof body.planId === 'string' ? body.planId : null;
  const billingCycle: 'monthly' | 'yearly' =
    body.billingCycle === 'yearly' ? 'yearly' : 'monthly';

  if (!planId) return NextResponse.json({ error: 'planId is required.' }, { status: 400 });

  // Validate planId
  if (!(planId in PLANS)) {
    return NextResponse.json({ error: 'Invalid planId.' }, { status: 400 });
  }

  // Determine which vendor to assign the plan to
  let targetVendorId: string | null = null;

  if (isSuperAdmin(actor)) {
    // Admin can pass an explicit vendorId
    targetVendorId = typeof body.vendorId === 'string' ? body.vendorId : null;
    if (!targetVendorId) {
      return NextResponse.json({ error: 'vendorId is required for admin.' }, { status: 400 });
    }
  } else {
    // Vendor admin upgrades their own subscription
    targetVendorId = actor.vendorId ?? null;
    if (!targetVendorId) {
      return NextResponse.json({ error: 'No vendor associated with this user.' }, { status: 400 });
    }
  }

  // Verify the vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: targetVendorId },
    select: { id: true },
  });
  if (!vendor) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });

  // Expire current active subscription
  await prisma.subscription.updateMany({
    where: { vendorId: targetVendorId, status: 'active' },
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
    data: {
      vendorId: targetVendorId,
      planId,
      status: 'active',
      startsAt: now,
      endsAt,
    },
  });

  return NextResponse.json({ success: true, data: subscription });
}
