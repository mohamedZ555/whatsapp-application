import prisma from '@/lib/prisma';
import { computePlanDisabledPerms } from '@/lib/access';
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

/** Count total nodes across all active bot flows for a vendor. */
async function countTotalBotFlowNodes(vendorId: string): Promise<number> {
  const flows = await prisma.botFlow.findMany({
    where: { vendorId, status: { not: 5 } },
    select: { data: true },
  });
  return flows.reduce((sum, flow) => {
    const nodes = (flow.data as any)?.nodes;
    return sum + (Array.isArray(nodes) ? nodes.length : 0);
  }, 0);
}

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

  const [contacts, botReplies, customFields, teamMembers, totalBotFlowNodes] = await Promise.all([
    prisma.contact.count({ where: { vendorId, status: { not: 5 } } }),
    prisma.botReply.count({ where: { vendorId, status: { not: 5 } } }),
    prisma.contactCustomField.count({ where: { vendorId, status: { not: 5 } } }),
    prisma.vendorUser.count({ where: { vendorId } }),
    countTotalBotFlowNodes(vendorId),
  ]);

  const items: UsageItem[] = [
    { key: 'contacts', label: 'Contacts', used: contacts, limit: plan.features.contacts },
    { key: 'botReplies', label: 'Bot Replies', used: botReplies, limit: plan.features.botReplies },
    { key: 'botFlowNodes', label: 'Bot Flow Nodes', used: totalBotFlowNodes, limit: plan.features.botFlowNodes },
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

/**
 * Check if adding/updating a flow stays within the vendor's total node limit.
 * @param vendorId - the vendor
 * @param newNodeCount - node count for the flow being created/updated
 * @param excludeFlowId - for updates, exclude this flow's current nodes from the total
 */
export async function checkFlowNodeLimit(
  vendorId: string,
  newNodeCount: number,
  excludeFlowId?: string,
): Promise<boolean> {
  const [subscription, plans] = await Promise.all([
    getVendorSubscription(vendorId),
    getServerPlans(),
  ]);
  const now = new Date();
  const isExpired =
    !subscription ||
    subscription.status !== 'active' ||
    (!!subscription.endsAt && subscription.endsAt < now);
  const planId = isExpired ? 'free' : (subscription?.planId ?? 'free');
  const plan = plans[planId] ?? plans['free'];
  if (!plan) return true;

  const limit = plan.features.botFlowNodes ?? -1;
  if (limit === -1) return true;
  if (limit === 0) return false;

  // Count total nodes across all existing flows (excluding the one being updated)
  const flows = await prisma.botFlow.findMany({
    where: {
      vendorId,
      status: { not: 5 },
      ...(excludeFlowId ? { id: { not: excludeFlowId } } : {}),
    },
    select: { data: true },
  });
  const existingNodes = flows.reduce((sum, flow) => {
    const nodes = (flow.data as any)?.nodes;
    return sum + (Array.isArray(nodes) ? nodes.length : 0);
  }, 0);

  return existingNodes + newNodeCount <= limit;
}

export async function getNodeLimitForVendor(vendorId: string): Promise<number> {
  const [subscription, plans] = await Promise.all([
    getVendorSubscription(vendorId),
    getServerPlans(),
  ]);
  const now = new Date();
  const isExpired =
    !subscription ||
    subscription.status !== 'active' ||
    (!!subscription.endsAt && subscription.endsAt < now);
  const planId = isExpired ? 'free' : (subscription?.planId ?? 'free');
  const plan = plans[planId] ?? plans['free'];
  return plan?.features?.botFlowNodes ?? 50;
}

export async function checkLimit(vendorId: string, featureKey: string): Promise<boolean> {
  const [subscription, plans] = await Promise.all([
    getVendorSubscription(vendorId),
    getServerPlans(),
  ]);
  // Expired subscriptions fall back to free plan limits
  const now = new Date();
  const isExpired =
    !subscription ||
    subscription.status !== 'active' ||
    (!!subscription.endsAt && subscription.endsAt < now);
  const planId = isExpired ? 'free' : (subscription?.planId ?? 'free');
  const plan = plans[planId] ?? plans['free'];
  if (!plan) return true;
  const limit = (plan.features as Record<string, number | boolean>)[featureKey];

  if (typeof limit === 'boolean') return limit;
  if (limit === undefined) return true;
  if (limit === -1) return true;
  if (limit === 0) return false;

  let currentCount = 0;
  switch (featureKey) {
    case 'contacts':
      currentCount = await prisma.contact.count({ where: { vendorId, status: { not: 5 } } });
      break;
    case 'botReplies':
      currentCount = await prisma.botReply.count({ where: { vendorId, status: { not: 5 } } });
      break;
    case 'contactCustomFields':
      currentCount = await prisma.contactCustomField.count({ where: { vendorId, status: { not: 5 } } });
      break;
    case 'teamMembers':
      currentCount = await prisma.vendorUser.count({ where: { vendorId } });
      break;
    case 'botFlowNodes':
      currentCount = await countTotalBotFlowNodes(vendorId);
      break;
  }

  return currentCount < (limit as number);
}

export function toPermissionArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export async function getPlanDisabledPermsForVendor(vendorId: string): Promise<string[]> {
  if (!vendorId) return [];

  const [subscription, plans] = await Promise.all([
    getVendorSubscription(vendorId),
    getServerPlans(),
  ]);

  const planId = subscription?.planId ?? 'free';
  const plan = plans[planId] ?? plans['free'];
  if (!plan) return [];

  return computePlanDisabledPerms(plan.features);
}

export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}
