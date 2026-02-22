import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vendorId = (session.user as any).vendorId;
  if (!vendorId) return NextResponse.json({ error: 'No vendor' }, { status: 403 });

  const [
    totalContacts,
    totalMessages,
    activeCampaigns,
    subscription,
    recentMessages,
    deliveryStats,
  ] = await Promise.all([
    prisma.contact.count({ where: { vendorId, status: 1 } }),
    prisma.whatsappMessageLog.count({ where: { vendorId } }),
    prisma.campaign.count({ where: { vendorId, status: { in: [1, 2] } } }),
    prisma.subscription.findFirst({ where: { vendorId, status: 'active' }, orderBy: { createdAt: 'desc' } }),
    prisma.whatsappMessageLog.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { contact: { select: { firstName: true, lastName: true, waId: true } } },
    }),
    prisma.whatsappMessageLog.groupBy({
      by: ['status'],
      where: { vendorId },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    totalContacts,
    totalMessages,
    activeCampaigns,
    planId: subscription?.planId ?? 'free',
    recentMessages,
    deliveryStats,
  });
}
