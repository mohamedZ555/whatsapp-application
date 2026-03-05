export const PLANS = {
  free: {
    id: 'free',
    title: 'Free',
    enabled: true,
    features: {
      contacts: 2,
      botReplies: 10,
      botFlowNodes: 50, // total nodes across ALL bot flows
      contactCustomFields: 2,
      teamMembers: 0,
      aiChatBot: true,
      apiAccess: true,
    },
    pricing: { monthly: 0, yearly: 0 },
    trialDays: 0,
    stripePriceIds: { monthly: null, yearly: null },
  },
  plan_1: {
    id: 'plan_1',
    title: 'Standard',
    enabled: true,
    features: {
      contacts: 500,
      botReplies: 50,
      botFlowNodes: 250, // total nodes across ALL bot flows
      contactCustomFields: 10,
      teamMembers: 5,
      aiChatBot: true,
      apiAccess: true,
    },
    pricing: { monthly: 10, yearly: 100 },
    trialDays: 14,
    stripePriceIds: { monthly: '', yearly: '' },
  },
  plan_2: {
    id: 'plan_2',
    title: 'Premium',
    enabled: true,
    features: {
      contacts: 5000,
      botReplies: 200,
      botFlowNodes: 1000, // total nodes across ALL bot flows
      contactCustomFields: 25,
      teamMembers: 10,
      aiChatBot: true,
      apiAccess: true,
    },
    pricing: { monthly: 20, yearly: 199 },
    trialDays: 14,
    stripePriceIds: { monthly: '', yearly: '' },
  },
  plan_3: {
    id: 'plan_3',
    title: 'Ultimate',
    enabled: true,
    features: {
      contacts: -1,
      botReplies: -1,
      botFlowNodes: -1, // unlimited total nodes
      contactCustomFields: -1,
      teamMembers: -1,
      aiChatBot: true,
      apiAccess: true,
    },
    pricing: { monthly: 30, yearly: 299 },
    trialDays: 14,
    stripePriceIds: { monthly: '', yearly: '' },
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const USER_ROLES = {
  SUPER_ADMIN: 1,
  VENDOR: 2,
  VENDOR_USER: 3,
} as const;

export const USER_STATUS = {
  ACTIVE: 1,
  INACTIVE: 2,
  SUSPENDED: 3,
  PENDING: 4,
  DELETED: 5,
  BLOCKED: 6,
} as const;

export const VENDOR_STATUS = {
  DELETED: 0,
  ACTIVE: 1,
  PENDING: 2,
  BANNED: 3,
} as const;

export const CAMPAIGN_STATUS = {
  UPCOMING: 1,
  PROCESSING: 2,
  EXECUTED: 3,
  CANCELLED: 5,
} as const;

export const QUEUE_STATUS = {
  IN_QUEUE: 1,
  FAILED: 2,
  PROCESSING: 3,
  PROCESSED: 4,
} as const;

export const BOT_TRIGGER_TYPES = [
  'welcome',
  'is',
  'starts_with',
  'ends_with',
  'contains_word',
  'contains',
  'stop_promotional',
  'start_promotional',
  'start_ai_bot',
  'stop_ai_bot',
] as const;

export const VENDOR_PERMISSIONS = [
  'manage_contacts',
  'manage_campaigns',
  'manage_templates',
  'manage_bot_replies',
  'manage_chat',
  'view_message_log',
  'manage_users',
] as const;

export type VendorPermission = (typeof VENDOR_PERMISSIONS)[number];
