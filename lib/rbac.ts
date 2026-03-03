import type { Session } from 'next-auth';
import prisma from '@/lib/prisma';
import { USER_ROLES, type VendorPermission } from '@/lib/constants';

export type AppActor = {
  userId: string;
  roleId: number;
  vendorId: string | null;
  permissions: string[];
  permissionsRestricted: boolean;
  planDisabledPerms: string[];
};

export function getActorFromSession(session: Session | null): AppActor | null {
  if (!session?.user) return null;
  const sessionUser = session.user as Session['user'] & {
    roleId?: number;
    vendorId?: string | null;
    permissions?: string[];
    permissionsRestricted?: boolean;
    planDisabledPerms?: string[];
  };
  if (typeof sessionUser.roleId !== 'number') return null;

  return {
    userId: session.user.id,
    roleId: sessionUser.roleId,
    vendorId: sessionUser.vendorId ?? null,
    permissions: Array.isArray(sessionUser.permissions) ? sessionUser.permissions : [],
    permissionsRestricted: Boolean(sessionUser.permissionsRestricted),
    planDisabledPerms: Array.isArray(sessionUser.planDisabledPerms) ? sessionUser.planDisabledPerms : [],
  };
}

export function isSuperAdmin(actor: AppActor): boolean {
  return actor.roleId === USER_ROLES.SUPER_ADMIN;
}

export function isVendorAdmin(actor: AppActor): boolean {
  return actor.roleId === USER_ROLES.VENDOR;
}

export function isVendorEmployee(actor: AppActor): boolean {
  return actor.roleId === USER_ROLES.VENDOR_USER;
}

export function hasVendorPermission(actor: AppActor, permission: VendorPermission): boolean {
  if (isSuperAdmin(actor)) return true;
  if (actor.planDisabledPerms.includes(permission)) return false;

  if (isVendorAdmin(actor)) {
    if (!actor.permissionsRestricted) return true;
    return actor.permissions.includes(permission);
  }

  if (isVendorEmployee(actor)) {
    return actor.permissions.includes(permission);
  }

  return false;
}

function normalizeVendorId(vendorId: string | null | undefined): string | undefined {
  if (!vendorId) return undefined;
  const trimmed = vendorId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveOptionalVendorFilter(
  actor: AppActor,
  requestedVendorId?: string | null
): string | undefined {
  if (isSuperAdmin(actor)) {
    return normalizeVendorId(requestedVendorId ?? undefined);
  }
  return normalizeVendorId(actor.vendorId ?? undefined);
}

export function resolveRequiredVendorId(
  actor: AppActor,
  requestedVendorId?: string | null
): string | undefined {
  if (isSuperAdmin(actor)) {
    return (
      normalizeVendorId(requestedVendorId ?? undefined) ??
      normalizeVendorId(actor.vendorId ?? undefined)
    );
  }
  return normalizeVendorId(actor.vendorId ?? undefined);
}

export function shouldBypassPlanLimits(actor: AppActor): boolean {
  return isSuperAdmin(actor);
}

export function canManageVendorUsers(actor: AppActor, targetVendorId: string): boolean {
  if (isSuperAdmin(actor)) return true;
  if (isVendorAdmin(actor) && actor.vendorId === targetVendorId) return true;
  return false;
}

export function getContactScope(actor: AppActor, overrideVendorId?: string) {
  if (isSuperAdmin(actor)) {
    return overrideVendorId ? { vendorId: overrideVendorId } : {};
  }

  if (!actor.vendorId) return { id: '__no_access__' };

  if (isVendorAdmin(actor)) {
    return { vendorId: actor.vendorId };
  }

  return {
    vendorId: actor.vendorId,
    assignedUserId: actor.userId,
  };
}

export async function getVendorOwnerUserId(vendorId: string): Promise<string | null> {
  const owner = await prisma.user.findFirst({
    where: { vendorId, roleId: USER_ROLES.VENDOR, status: 1 },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return owner?.id ?? null;
}
