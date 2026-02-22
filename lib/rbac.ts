import type { Session } from 'next-auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

export type AppActor = {
  userId: string;
  roleId: number;
  vendorId: string | null;
  permissions: string[];
};

export function getActorFromSession(session: Session | null): AppActor | null {
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    roleId: (session.user as any).roleId as number,
    vendorId: ((session.user as any).vendorId as string | null) ?? null,
    permissions: (((session.user as any).permissions as string[]) ?? []),
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

