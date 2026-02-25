import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerPlans } from '@/lib/plans';
import { getVendorUsage } from '@/lib/permissions';
import { USER_ROLES } from '@/lib/constants';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const vendorId = user.vendorId as string | undefined;
  const roleId = user.roleId as number | undefined;

  // Super admin has no vendor
  if (roleId === USER_ROLES.SUPER_ADMIN || !vendorId) {
    return NextResponse.json({ error: 'No vendor context' }, { status: 400 });
  }

  const [usage, plans] = await Promise.all([
    getVendorUsage(vendorId),
    getServerPlans(),
  ]);

  // Serialize dates for JSON
  return NextResponse.json({
    planId: usage.planId,
    plan: usage.plan,
    plans,
    subscription: usage.subscription
      ? {
          ...usage.subscription,
          startsAt: usage.subscription.startsAt?.toISOString() ?? null,
          endsAt: usage.subscription.endsAt?.toISOString() ?? null,
        }
      : null,
    isExpired: usage.isExpired,
    items: usage.items,
  });
}
