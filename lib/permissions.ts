import prisma from '@/lib/prisma';
import { PLANS, type PlanId } from '@/lib/constants';

export async function getVendorSubscription(vendorId: string) {
  return prisma.subscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function checkLimit(
  vendorId: string,
  featureKey: keyof (typeof PLANS)['free']['features']
): Promise<boolean> {
  const subscription = await getVendorSubscription(vendorId);
  const planId = (subscription?.planId ?? 'free') as PlanId;
  const plan = PLANS[planId];
  const limit = plan.features[featureKey];

  if (typeof limit === 'boolean') return limit;
  if (limit === -1) return true; // unlimited

  let currentCount = 0;

  switch (featureKey) {
    case 'contacts':
      currentCount = await prisma.contact.count({ where: { vendorId, status: 1 } });
      break;
    case 'campaignsPerMonth':
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      currentCount = await prisma.campaign.count({
        where: { vendorId, createdAt: { gte: startOfMonth } },
      });
      break;
    case 'botReplies':
      currentCount = await prisma.botReply.count({ where: { vendorId, status: 1 } });
      break;
    case 'botFlows':
      currentCount = await prisma.botFlow.count({ where: { vendorId, status: 1 } });
      break;
    case 'contactCustomFields':
      currentCount = await prisma.contactCustomField.count({ where: { vendorId, status: 1 } });
      break;
    case 'teamMembers':
      if (limit === 0) return false;
      currentCount = await prisma.vendorUser.count({ where: { vendorId } });
      break;
  }

  return currentCount < (limit as number);
}

export function hasPermission(
  permissions: string[],
  permission: string
): boolean {
  return permissions.includes(permission);
}
