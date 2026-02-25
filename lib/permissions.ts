import prisma from '@/lib/prisma';
import { type PlanId } from '@/lib/constants';
import { getServerPlans } from '@/lib/plans';

export async function getVendorSubscription(vendorId: string) {
  return prisma.subscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function checkLimit(
  vendorId: string,
  featureKey: string
): Promise<boolean> {
  const [subscription, plans] = await Promise.all([
    getVendorSubscription(vendorId),
    getServerPlans(),
  ]);
  const planId = subscription?.planId ?? 'free';
  const plan = plans[planId] ?? plans['free'];
  if (!plan) return true;
  const limit = (plan.features as Record<string, number | boolean>)[featureKey];

  if (typeof limit === 'boolean') return limit;
  if (limit === undefined) return true;
  if (limit === -1) return true;

  let currentCount = 0;
  switch (featureKey) {
    case 'contacts':
      currentCount = await prisma.contact.count({ where: { vendorId, status: 1 } });
      break;
    case 'campaignsPerMonth': {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      currentCount = await prisma.campaign.count({ where: { vendorId, createdAt: { gte: startOfMonth } } });
      break;
    }
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

export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}
