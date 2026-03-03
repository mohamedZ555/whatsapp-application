import { USER_ROLES, type VendorPermission } from '@/lib/constants';

export type DashboardNavItem = {
  key: string;
  href: string;
  icon: 'layout' | 'users' | 'message-circle' | 'megaphone' | 'file-text' | 'bot' | 'history' | 'shield' | 'gem' | 'settings' | 'smartphone' | 'receipt' | 'headphones';
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

/**
 * Determines if a user can see/access a dashboard nav item.
 *
 * Rules:
 * - SUPER_ADMIN: always yes (except superAdminOnly items are only for SA)
 * - VENDOR: full access unless super admin explicitly restricted them (permissionsRestricted=true),
 *   in which case they need the permission in their array. Owner-only items are always accessible.
 * - VENDOR_USER: needs explicit permission. Owner-only items are always blocked.
 * - Plan-disabled permissions block access for VENDOR and VENDOR_USER alike.
 */
export function canAccessDashboardItem(
  roleId: number | undefined,
  permissions: string[] | undefined,
  item: DashboardNavItem,
  planDisabledPerms: string[] = [],
  permissionsRestricted: boolean = false,
): boolean {
  if (item.superAdminOnly) return roleId === USER_ROLES.SUPER_ADMIN;
  if (roleId === USER_ROLES.SUPER_ADMIN) return true;

  // Plan-level block applies to both VENDOR and VENDOR_USER
  if (item.requiredPermission && planDisabledPerms.includes(item.requiredPermission)) return false;

  if (roleId === USER_ROLES.VENDOR) {
    // Owner-only items (subscription, transactions, support, settings) are always accessible to the vendor admin
    if (item.ownerOnly) return true;
    // If super admin has not placed any restrictions, vendor admin has full access
    if (!permissionsRestricted) return true;
    // Super admin explicitly restricted this vendor admin — check their permissions
    if (!item.requiredPermission) return true;
    return (permissions ?? []).includes(item.requiredPermission);
  }

  if (roleId !== USER_ROLES.VENDOR_USER) return false;
  if (item.ownerOnly) return false;
  if (!item.requiredPermission) return true;
  return (permissions ?? []).includes(item.requiredPermission);
}

/**
 * Path-level access control used in proxy.ts (middleware).
 * Same logic as canAccessDashboardItem but for raw URL paths.
 */
export function canAccessVendorPath(
  pathWithoutLocale: string,
  roleId: number | undefined,
  permissions: string[] | undefined,
  planDisabledPerms: string[] = [],
  permissionsRestricted: boolean = false,
): boolean {
  if (roleId === USER_ROLES.SUPER_ADMIN) return true;

  const perms = new Set(permissions ?? []);
  const pathRules: Array<{ path: string; permission?: VendorPermission; ownerOnly?: boolean }> = [
    { path: '/dashboard' },
    { path: '/contacts', permission: 'manage_contacts' },
    { path: '/chat', permission: 'manage_chat' },
    { path: '/campaigns', permission: 'manage_campaigns' },
    { path: '/templates', permission: 'manage_templates' },
    { path: '/bot-replies', permission: 'manage_bot_replies' },
    { path: '/message-log', permission: 'view_message_log' },
    { path: '/users', permission: 'manage_users' },
    { path: '/subscription', ownerOnly: true },
    { path: '/transactions', ownerOnly: true },
    { path: '/support', ownerOnly: true },
    { path: '/settings', ownerOnly: true },
  ];

  const matchingRule = pathRules.find(
    (rule) => pathWithoutLocale === rule.path || pathWithoutLocale.startsWith(`${rule.path}/`)
  );
  if (!matchingRule) return false;

  // Plan-level block
  if (matchingRule.permission && planDisabledPerms.includes(matchingRule.permission)) return false;

  if (roleId === USER_ROLES.VENDOR) {
    if (matchingRule.ownerOnly) return true;
    if (!permissionsRestricted) return true;
    if (!matchingRule.permission) return true;
    return perms.has(matchingRule.permission);
  }

  if (roleId !== USER_ROLES.VENDOR_USER) return false;
  if (matchingRule.ownerOnly) return false;
  if (!matchingRule.permission) return true;
  return perms.has(matchingRule.permission);
}
