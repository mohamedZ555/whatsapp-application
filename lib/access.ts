import { USER_ROLES, type VendorPermission } from '@/lib/constants';

export type DashboardNavItem = {
  key: string;
  href: string;
  icon:
    | 'layout'
    | 'users'
    | 'message-circle'
    | 'megaphone'
    | 'file-text'
    | 'bot'
    | 'history'
    | 'shield'
    | 'gem'
    | 'settings'
    | 'smartphone'
    | 'receipt'
    | 'headphones';
  requiredPermission?: VendorPermission;
  ownerOnly?: boolean;
  superAdminOnly?: boolean;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: 'layout' },
  { key: 'contacts', href: '/contacts', icon: 'users', requiredPermission: 'manage_contacts' },
  { key: 'chat', href: '/chat', icon: 'message-circle', requiredPermission: 'manage_chat' },
  { key: 'campaigns', href: '/campaigns', icon: 'megaphone', requiredPermission: 'manage_campaigns' },
  { key: 'templates', href: '/templates', icon: 'file-text', requiredPermission: 'manage_templates' },
  { key: 'botReplies', href: '/bot-replies', icon: 'bot', requiredPermission: 'manage_bot_replies' },
  { key: 'messageLog', href: '/message-log', icon: 'history', requiredPermission: 'view_message_log' },
  { key: 'users', href: '/users', icon: 'shield', requiredPermission: 'manage_users' },
  { key: 'subscription', href: '/subscription', icon: 'gem', ownerOnly: true },
  { key: 'transactions', href: '/transactions', icon: 'receipt', ownerOnly: true },
  { key: 'support', href: '/support', icon: 'headphones', ownerOnly: true },
  { key: 'settings', href: '/settings', icon: 'settings', ownerOnly: true },
  { key: 'adminPanel', href: '/admin', icon: 'shield', superAdminOnly: true },
];

type AccessRule = {
  path: string;
  requiredPermission?: VendorPermission;
  ownerOnly?: boolean;
};

const DASHBOARD_PATH_RULES: AccessRule[] = DASHBOARD_NAV_ITEMS.filter((item) => !item.superAdminOnly).map((item) => ({
  path: item.href,
  requiredPermission: item.requiredPermission,
  ownerOnly: item.ownerOnly,
}));

const EXTRA_VENDOR_PATH_RULES: AccessRule[] = [
  // Job categories remains owner-scoped, but still respects manage_users restrictions.
  { path: '/settings/job-categories', requiredPermission: 'manage_users', ownerOnly: true },
];

const VENDOR_PATH_RULES: AccessRule[] = [...EXTRA_VENDOR_PATH_RULES, ...DASHBOARD_PATH_RULES].sort(
  (a, b) => b.path.length - a.path.length,
);

/**
 * Compute which permissions are disabled purely by plan limits.
 * A feature is "disabled" when its plan limit is exactly 0 (not allowed at all).
 */
export function computePlanDisabledPerms(features: {
  teamMembers: number;
  campaignsPerMonth: number;
  botReplies: number;
  botFlows: number;
  contacts: number;
}): string[] {
  const disabled: string[] = [];
  if (features.teamMembers === 0) disabled.push('manage_users');
  if (features.campaignsPerMonth === 0) disabled.push('manage_campaigns');
  if (features.botReplies === 0 && features.botFlows === 0) disabled.push('manage_bot_replies');
  if (features.contacts === 0) disabled.push('manage_contacts');
  return disabled;
}

function isPermissionAllowedByRole(
  roleId: number | undefined,
  permissions: string[] | undefined,
  requiredPermission: VendorPermission | undefined,
  ownerOnly: boolean | undefined,
  planDisabledPerms: string[],
  permissionsRestricted: boolean,
): boolean {
  if (roleId === USER_ROLES.SUPER_ADMIN) return true;

  if (requiredPermission && planDisabledPerms.includes(requiredPermission)) return false;

  const perms = new Set(permissions ?? []);

  if (roleId === USER_ROLES.VENDOR) {
    if (ownerOnly && !requiredPermission) return true;
    if (!requiredPermission) return true;
    if (!permissionsRestricted) return true;
    return perms.has(requiredPermission);
  }

  if (roleId !== USER_ROLES.VENDOR_USER) return false;
  if (ownerOnly) return false;
  if (!requiredPermission) return true;
  return perms.has(requiredPermission);
}

/**
 * Determines if a user can see/access a dashboard nav item.
 */
export function canAccessDashboardItem(
  roleId: number | undefined,
  permissions: string[] | undefined,
  item: DashboardNavItem,
  planDisabledPerms: string[] = [],
  permissionsRestricted: boolean = false,
): boolean {
  if (item.superAdminOnly) return roleId === USER_ROLES.SUPER_ADMIN;

  return isPermissionAllowedByRole(
    roleId,
    permissions,
    item.requiredPermission,
    item.ownerOnly,
    planDisabledPerms,
    permissionsRestricted,
  );
}

/**
 * Path-level access control used in proxy.ts (middleware).
 * Uses the same role/permission logic as canAccessDashboardItem.
 */
export function canAccessVendorPath(
  pathWithoutLocale: string,
  roleId: number | undefined,
  permissions: string[] | undefined,
  planDisabledPerms: string[] = [],
  permissionsRestricted: boolean = false,
): boolean {
  const matchingRule = VENDOR_PATH_RULES.find(
    (rule) => pathWithoutLocale === rule.path || pathWithoutLocale.startsWith(`${rule.path}/`),
  );
  if (!matchingRule) return false;

  return isPermissionAllowedByRole(
    roleId,
    permissions,
    matchingRule.requiredPermission,
    matchingRule.ownerOnly,
    planDisabledPerms,
    permissionsRestricted,
  );
}
