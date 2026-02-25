import prisma from '@/lib/prisma';
import { PLANS } from '@/lib/constants';

export type PlanFeatures = {
  contacts: number;
  campaignsPerMonth: number;
  botReplies: number;
  botFlows: number;
  contactCustomFields: number;
  teamMembers: number;
  aiChatBot: boolean;
  apiAccess: boolean;
};

export type PlanConfig = {
  id: string;
  title: string;
  enabled: boolean;
  features: PlanFeatures;
  pricing: { monthly: number; yearly: number };
  trialDays: number;
  stripePriceIds: { monthly: string | null; yearly: string | null };
};

export type PlansMap = Record<string, PlanConfig>;

// Load plans from DB config, fall back to lib/constants defaults
export async function getServerPlans(): Promise<PlansMap> {
  try {
    const config = await prisma.configuration.findFirst({ where: { configKey: 'plans_config' } });
    if (config?.configValue) {
      const overrides = JSON.parse(config.configValue) as Record<string, Partial<PlanConfig>>;
      const result: PlansMap = {};
      for (const [id, base] of Object.entries(PLANS)) {
        const ov = overrides[id] ?? {};
        result[id] = {
          ...(base as unknown as PlanConfig),
          ...ov,
          id,
          features: { ...(base.features as unknown as PlanFeatures), ...(ov.features ?? {}) },
          pricing: { ...base.pricing, ...(ov.pricing ?? {}) },
          stripePriceIds: {
            monthly: base.stripePriceIds?.monthly ?? null,
            yearly: base.stripePriceIds?.yearly ?? null,
            ...(ov.stripePriceIds ?? {}),
          },
        };
      }
      return result;
    }
  } catch { /* fall through */ }
  // Return defaults
  const result: PlansMap = {};
  for (const [id, p] of Object.entries(PLANS)) {
    result[id] = p as unknown as PlanConfig;
  }
  return result;
}
