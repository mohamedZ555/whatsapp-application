import prisma from '@/lib/prisma';
import { getServerPlans, type PlanConfig } from '@/lib/plans';

export async function getVendorSubscription(vendorId: string) {
  return prisma.subscription.findFirst({
    where: { vendorId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
}

export type UsageItem = {
  key: string;
  label: string;
  used: number;
  limit: number; // -1 = unlimited, 0 = not allowed
};

export type VendorUsageResult = {
  planId: string;
  plan: PlanConfig;
  subscription: {
    id: string;
    status: string;
    startsAt: Date | null;
    endsAt: Date | null;
  } | null;
  isExpired: boolean;
  items: UsageItem[];
};

export async function getVendorUsage(vendorId: string): Promise<VendorUsageResult> {
  const [subscription, plans] = await Promise.all([
    getVendorSubscription(vendorId),
    getServerPlans(),
  ]);

  const planId = subscription?.planId ?? 'free';
  const plan = (plans[planId] ?? plans['free']) as PlanConfig;

  // Check expiry: if subscription exists but endsAt is in the past, treat as expired
  const now = new Date();
  const isExpired =
    !subscription ||
    subscription.status !== 'active' ||
    (!!subscription.endsAt && subscription.endsAt < now);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [contacts, campaigns, botReplies, botFlows, customFields, teamMembers] = await Promise.all([
    prisma.contact.count({ where: { vendorId, status: { not: 5 } } }),
    prisma.campaign.count({ where: { vendorId, createdAt: { gte: monthStart }, status: { not: 5 } } }),
    prisma.botReply.count({ where: { vendorId, status: { not: 5 } } }),
    prisma.botFlow.count({ where: { vendorId, status: { not: 5 } } }),
    prisma.contactCustomField.count({ where: { vendorId, status: { not: 5 } } }),
    prisma.vendorUser.count({ where: { vendorId } }),
  ]);

  const items: UsageItem[] = [
    { key: 'contacts', label: 'Contacts', used: contacts, limit: plan.features.contacts },
    { key: 'campaignsPerMonth', label: 'Campaigns / Month', used: campaigns, limit: plan.features.campaignsPerMonth },
    { key: 'botReplies', label: 'Bot Replies', used: botReplies, limit: plan.features.botReplies },
    { key: 'botFlows', label: 'Bot Flows', used: botFlows, limit: plan.features.botFlows },
    { key: 'contactCustomFields', label: 'Custom Fields', used: customFields, limit: plan.features.contactCustomFields },
    { key: 'teamMembers', label: 'Team Members', used: teamMembers, limit: plan.features.teamMembers },
  ];

  return {
    planId,
    plan,
    subscription: subscription
      ? { id: subscription.id, status: subscription.status, startsAt: subscription.startsAt, endsAt: subscription.endsAt }
      : null,
    isExpired,
    items,
  };
}

export async function checkLimit(vendorId: string, featureKey: string): Promise<boolean> {
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
  if (limit === 0) return false;

  const now = new Date();
  let currentCount = 0;
  switch (featureKey) {
    case 'contacts':
      currentCount = await prisma.contact.count({ where: { vendorId, status: { not: 5 } } });
      break;
    case 'campaignsPerMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      currentCount = await prisma.campaign.count({ where: { vendorId, createdAt: { gte: startOfMonth }, status: { not: 5 } } });
      break;
    }
    case 'botReplies':
      currentCount = await prisma.botReply.count({ where: { vendorId, status: { not: 5 } } });
      break;
    case 'botFlows':
      currentCount = await prisma.botFlow.count({ where: { vendorId, status: { not: 5 } } });
      break;
    case 'contactCustomFields':
      currentCount = await prisma.contactCustomField.count({ where: { vendorId, status: { not: 5 } } });
      break;
    case 'teamMembers':
      currentCount = await prisma.vendorUser.count({ where: { vendorId } });
      break;
  }

  return currentCount < (limit as number);
}

export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}
