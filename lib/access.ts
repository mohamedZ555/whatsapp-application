import { USER_ROLES, type VendorPermission } from '@/lib/constants';

export type DashboardNavItem = {
  key: string;
  href: string;
  icon: 'layout' | 'users' | 'message-circle' | 'megaphone' | 'file-text' | 'bot' | 'history' | 'shield' | 'gem' | 'settings' | 'smartphone' | 'receipt';
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
  { key: 'settings', href: '/settings', icon: 'settings', ownerOnly: true },
  { key: 'adminPanel', href: '/admin', icon: 'shield', superAdminOnly: true },
];

export function canAccessDashboardItem(
  roleId: number | undefined,
  permissions: string[] | undefined,
  item: DashboardNavItem
): boolean {
  if (item.superAdminOnly) return roleId === USER_ROLES.SUPER_ADMIN;
  if (roleId === USER_ROLES.SUPER_ADMIN) return true;
  if (roleId === USER_ROLES.VENDOR) return true;
  if (roleId !== USER_ROLES.VENDOR_USER) return false;
  if (item.ownerOnly) return false;
  if (!item.requiredPermission) return true;
  return (permissions ?? []).includes(item.requiredPermission);
}

export function canAccessVendorPath(
  pathWithoutLocale: string,
  roleId: number | undefined,
  permissions: string[] | undefined
): boolean {
  if (roleId === USER_ROLES.SUPER_ADMIN) return true;
  if (roleId === USER_ROLES.VENDOR) return true;
  if (roleId !== USER_ROLES.VENDOR_USER) return false;

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
    { path: '/settings', ownerOnly: true },
  ];

  const matchingRule = pathRules.find(
    (rule) => pathWithoutLocale === rule.path || pathWithoutLocale.startsWith(`${rule.path}/`)
  );
  if (!matchingRule) return false;
  if (matchingRule.ownerOnly) return false;
  if (!matchingRule.permission) return true;
  return perms.has(matchingRule.permission);
}
