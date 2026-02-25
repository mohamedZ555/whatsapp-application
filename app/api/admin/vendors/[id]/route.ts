import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.roleId !== USER_ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      subscriptions: {
        where: { status: 'active' },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          contacts: true,
          campaigns: true,
          botReplies: true,
          botFlows: true,
          users: true,
          vendorUsers: true,
        },
      },
    },
  });

  if (!vendor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    vendor: {
      id: vendor.id,
      uid: vendor.uid,
      title: vendor.title,
      slug: vendor.slug,
      status: vendor.status,
      stripeCustomerId: vendor.stripeCustomerId,
      trialEndsAt: vendor.trialEndsAt?.toISOString() ?? null,
      createdAt: vendor.createdAt.toISOString(),
      subscription: vendor.subscriptions[0]
        ? {
            planId: vendor.subscriptions[0].planId,
            status: vendor.subscriptions[0].status,
            endsAt: vendor.subscriptions[0].endsAt?.toISOString() ?? null,
          }
        : null,
      _count: vendor._count,
    },
  });
}
