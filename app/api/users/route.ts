import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { USER_ROLES } from "@/lib/constants";
import { checkLimit } from "@/lib/permissions";
import {
  canManageVendorUsers,
  getActorFromSession,
  hasVendorPermission,
  isSuperAdmin,
  isVendorAdmin,
  resolveOptionalVendorFilter,
  resolveRequiredVendorId,
  shouldBypassPlanLimits,
} from "@/lib/rbac";
import { getPlanDisabledPermsForVendor } from "@/lib/permissions";

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePermissions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function canManageTargetUser(
  actor: { roleId: number; vendorId: string | null },
  target: { roleId: number; vendorId: string | null },
): boolean {
  if (actor.roleId === USER_ROLES.SUPER_ADMIN) return true;
  if (actor.roleId !== USER_ROLES.VENDOR) return false;
  if (!actor.vendorId) return false;
  return (
    target.roleId === USER_ROLES.VENDOR_USER &&
    target.vendorId === actor.vendorId
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(actor) && !isVendorAdmin(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isVendorAdmin(actor) && !hasVendorPermission(actor, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const vendorIdParam = searchParams.get("vendorId") ?? undefined;
  const roleParam = searchParams.get("roleId");
  const vendorIdFilter = resolveOptionalVendorFilter(actor, vendorIdParam);
  if (!vendorIdFilter && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roleId = roleParam ? parseInt(roleParam, 10) : undefined;
  const where: Prisma.UserWhereInput = {
    ...(vendorIdFilter ? { vendorId: vendorIdFilter } : {}),
    ...(roleId ? { roleId } : {}),
    status: { not: 5 },
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      role: { select: { id: true, title: true } },
      vendor: { select: { id: true, title: true, uid: true } },
      vendorUserDetail: {
        include: {
          jobCategory: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    firstName,
    lastName,
    username,
    email,
    mobileNumber,
    password,
    roleId,
    vendorId: requestedVendorId,
    vendorTitle,
    permissions,
  } = body ?? {};

  if (!firstName || !lastName || !username || !email || !password || !roleId) {
    return NextResponse.json(
      { error: "Required fields are missing." },
      { status: 400 },
    );
  }

  const parsedRoleId = Number(roleId);
  if (
    parsedRoleId !== USER_ROLES.VENDOR &&
    parsedRoleId !== USER_ROLES.VENDOR_USER
  ) {
    return NextResponse.json(
      { error: "Invalid target role." },
      { status: 400 },
    );
  }

  if (!isSuperAdmin(actor) && !isVendorAdmin(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isVendorAdmin(actor) && !hasVendorPermission(actor, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isVendorAdmin(actor) && parsedRoleId !== USER_ROLES.VENDOR_USER) {
    return NextResponse.json(
      { error: "Admin can only create employee users." },
      { status: 403 },
    );
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: String(email).toLowerCase() },
        { username: String(username).toLowerCase() },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email or username already in use." },
      { status: 409 },
    );
  }

  let finalVendorId: string | null = null;
  if (parsedRoleId === USER_ROLES.VENDOR) {
    if (!isSuperAdmin(actor)) {
      return NextResponse.json(
        { error: "Only super admin can create admin accounts." },
        { status: 403 },
      );
    }
    const vendor = await prisma.vendor.create({
      data: {
        title: vendorTitle ?? `${firstName} ${lastName} Workspace`,
        status: 1,
      },
    });
    finalVendorId = vendor.id;

    await prisma.subscription.create({
      data: { vendorId: vendor.id, planId: "free", status: "active" },
    });
  } else {
    finalVendorId = resolveRequiredVendorId(actor, requestedVendorId) ?? null;
    if (!finalVendorId) {
      return NextResponse.json(
        { error: "Target vendor is required." },
        { status: 400 },
      );
    }
    if (!canManageVendorUsers(actor, finalVendorId)) {
      return NextResponse.json(
        { error: "Forbidden for this vendor." },
        { status: 403 },
      );
    }

    if (!shouldBypassPlanLimits(actor)) {
      const canAdd = await checkLimit(finalVendorId, "teamMembers");
      if (!canAdd) {
        return NextResponse.json(
          { error: "Team member limit reached for subscription." },
          { status: 403 },
        );
      }
    }
  }

  const hashed = await bcrypt.hash(String(password), 12);
  const user = await prisma.user.create({
    data: {
      firstName: String(firstName),
      lastName: String(lastName),
      username: String(username).toLowerCase(),
      email: String(email).toLowerCase(),
      mobileNumber: mobileNumber ? String(mobileNumber) : null,
      password: hashed,
      roleId: parsedRoleId,
      vendorId: finalVendorId,
      status: 1,
    },
  });

  if (parsedRoleId === USER_ROLES.VENDOR_USER && finalVendorId) {
    const jobCategoryId = body.jobCategoryId
      ? String(body.jobCategoryId)
      : null;
    // Validate job category belongs to this vendor
    if (jobCategoryId) {
      const cat = await prisma.employeeJobCategory.findFirst({
        where: { id: jobCategoryId, vendorId: finalVendorId },
      });
      if (!cat)
        return NextResponse.json(
          { error: "Invalid job category." },
          { status: 400 },
        );
    }
    await prisma.vendorUser.create({
      data: {
        vendorId: finalVendorId,
        userId: user.id,
        permissions: Array.isArray(permissions) ? permissions : [],
        jobCategoryId,
      },
    });
  }

  return NextResponse.json({ success: true, data: user });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(actor) && !isVendorAdmin(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isVendorAdmin(actor) && !hasVendorPermission(actor, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const userId = normalizeString(body?.userId);
  if (!userId)
    return NextResponse.json({ error: "userId is required." }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendorUserDetail: true },
  });
  if (!target || target.status === 5)
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!canManageTargetUser(actor, target))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requestedRoleId = body?.roleId;
  const parsedRoleId =
    requestedRoleId !== undefined ? Number(requestedRoleId) : undefined;
  if (requestedRoleId !== undefined) {
    if (!Number.isInteger(parsedRoleId)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    const allowedRoles: number[] = [
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.VENDOR,
      USER_ROLES.VENDOR_USER,
    ];
    if (!allowedRoles.includes(parsedRoleId!)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (!isSuperAdmin(actor)) {
      return NextResponse.json(
        { error: "Only super admin can update roles." },
        { status: 403 },
      );
    }
  }

  const requestedStatus = body?.status;
  const parsedStatus =
    requestedStatus !== undefined ? Number(requestedStatus) : undefined;
  if (requestedStatus !== undefined && !Number.isInteger(parsedStatus)) {
    return NextResponse.json(
      { error: "Invalid status value." },
      { status: 400 },
    );
  }

  if (target.id === actor.userId) {
    if (parsedRoleId !== undefined && parsedRoleId !== target.roleId) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 403 },
      );
    }
    if (parsedStatus === 5) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 403 },
      );
    }
  }

  const nextRoleId = parsedRoleId ?? target.roleId;
  const requestedVendorId =
    body?.vendorId === null
      ? null
      : (normalizeString(body?.vendorId) ?? undefined);

  let nextVendorId = target.vendorId;
  if (
    nextRoleId === USER_ROLES.VENDOR ||
    nextRoleId === USER_ROLES.VENDOR_USER
  ) {
    const resolvedVendorId = resolveRequiredVendorId(
      actor,
      requestedVendorId ?? target.vendorId ?? undefined,
    );
    if (!resolvedVendorId) {
      return NextResponse.json(
        { error: "Target vendor is required." },
        { status: 400 },
      );
    }
    if (!canManageVendorUsers(actor, resolvedVendorId)) {
      return NextResponse.json(
        { error: "Forbidden for this vendor." },
        { status: 403 },
      );
    }
    nextVendorId = resolvedVendorId;
  } else if (
    nextRoleId === USER_ROLES.SUPER_ADMIN &&
    requestedVendorId !== undefined
  ) {
    nextVendorId = requestedVendorId;
  }

  const nextEmail = normalizeString(body?.email)?.toLowerCase();
  const nextUsername = normalizeString(body?.username)?.toLowerCase();

  if (nextEmail && nextEmail !== target.email.toLowerCase()) {
    const emailTaken = await prisma.user.findFirst({
      where: { email: nextEmail, id: { not: target.id } },
      select: { id: true },
    });
    if (emailTaken)
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 },
      );
  }

  if (nextUsername && nextUsername !== target.username.toLowerCase()) {
    const usernameTaken = await prisma.user.findFirst({
      where: { username: nextUsername, id: { not: target.id } },
      select: { id: true },
    });
    if (usernameTaken)
      return NextResponse.json(
        { error: "Username already in use." },
        { status: 409 },
      );
  }

  const hashedPassword = normalizeString(body?.password)
    ? await bcrypt.hash(String(body.password), 12)
    : undefined;

  await prisma.user.update({
    where: { id: target.id },
    data: {
      firstName: normalizeString(body?.firstName) ?? target.firstName,
      lastName: normalizeString(body?.lastName) ?? target.lastName,
      username: nextUsername ?? target.username,
      email: nextEmail ?? target.email,
      mobileNumber:
        body?.mobileNumber === null
          ? null
          : (normalizeString(body?.mobileNumber) ?? target.mobileNumber),
      status: parsedStatus ?? target.status,
      roleId: nextRoleId,
      vendorId: nextVendorId,
      ...(hashedPassword ? { password: hashedPassword } : {}),
    },
  });

  if (
    target.roleId === USER_ROLES.VENDOR &&
    target.vendorId &&
    parsedStatus !== undefined &&
    parsedStatus !== target.status
  ) {
    if (parsedStatus === 6 || parsedStatus === 3) {
      // Ban or Suspend
      await prisma.vendor.update({
        where: { id: target.vendorId },
        data: { status: 3 },
      });
      await prisma.user.updateMany({
        where: {
          vendorId: target.vendorId,
          id: { not: target.id },
          status: { not: 5 },
        },
        data: { status: parsedStatus === 6 ? 6 : 3 },
      });
    } else if (parsedStatus === 1) {
      // Unban or Actuate
      await prisma.vendor.update({
        where: { id: target.vendorId },
        data: { status: 1 },
      });
      await prisma.user.updateMany({
        where: {
          vendorId: target.vendorId,
          id: { not: target.id },
          status: { in: [6, 3] },
        },
        data: { status: 1 },
      });
    }
  }

  const permissions = normalizePermissions(body?.permissions);
  const jobCategoryIdRaw = body?.jobCategoryId;
  const jobCategoryId =
    jobCategoryIdRaw === null
      ? null
      : typeof jobCategoryIdRaw === "string" && jobCategoryIdRaw.trim()
        ? jobCategoryIdRaw.trim()
        : undefined;

  // ── Permission inheritance enforcement ──────────────────────────────────
  // For VENDOR_USER (employees): permissions must be a subset of their admin's permissions.
  if (nextRoleId === USER_ROLES.VENDOR_USER && permissions && nextVendorId) {
    // Find the admin of this vendor
    const adminUser = await prisma.user.findFirst({
      where: {
        vendorId: nextVendorId,
        roleId: USER_ROLES.VENDOR,
        status: { not: 5 },
      },
      include: { vendorUserDetail: { select: { permissions: true } } },
    });
    if (adminUser) {
      const adminPerms =
        (adminUser.vendorUserDetail?.permissions as string[]) ?? [];
      const outOfScope = permissions.filter((p) => !adminPerms.includes(p));
      if (outOfScope.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot assign permissions that the admin does not have: ${outOfScope.join(", ")}.`,
            outOfScopePermissions: outOfScope,
            adminPermissions: adminPerms,
          },
          { status: 422 },
        );
      }
    }
  }

  if (
    (nextRoleId === USER_ROLES.VENDOR_USER ||
      nextRoleId === USER_ROLES.VENDOR) &&
    nextVendorId
  ) {
    // ── Plan-disabled perms enforcement for ADMIN (VENDOR) ────────────────
    // Strip any plan-disabled permissions before saving
    let effectivePermissions = permissions;
    if (
      nextRoleId === USER_ROLES.VENDOR &&
      effectivePermissions &&
      nextVendorId
    ) {
      const planDisabledPerms =
        await getPlanDisabledPermsForVendor(nextVendorId);
      if (planDisabledPerms.length > 0) {
        effectivePermissions = effectivePermissions.filter(
          (p) => !planDisabledPerms.includes(p),
        );
      }
    }

    await prisma.vendorUser.upsert({
      where: { userId: target.id },
      update: {
        vendorId: nextVendorId,
        ...(effectivePermissions ? { permissions: effectivePermissions } : {}),
        ...(jobCategoryId !== undefined ? { jobCategoryId } : {}),
      },
      create: {
        userId: target.id,
        vendorId: nextVendorId,
        permissions: effectivePermissions ?? [],
        jobCategoryId: typeof jobCategoryId === "string" ? jobCategoryId : null,
      },
    });

    // ── Cascade permission removal to employees when admin permissions change ──
    // If we just updated an ADMIN's permissions, cascade removals down to employees.
    if (nextRoleId === USER_ROLES.VENDOR && effectivePermissions) {
      const adminPerms = effectivePermissions;

      // Get all employees in this vendor
      const employeeVendorUsers = await prisma.vendorUser.findMany({
        where: {
          vendorId: nextVendorId,
          user: { roleId: USER_ROLES.VENDOR_USER, status: { not: 5 } },
        },
        select: { userId: true, permissions: true },
      });

      // Strip any permissions the admin no longer has
      for (const emp of employeeVendorUsers) {
        const empPerms = (emp.permissions as string[]) ?? [];
        const stripped = empPerms.filter((p) => adminPerms.includes(p));
        if (stripped.length !== empPerms.length) {
          await prisma.vendorUser.update({
            where: { userId: emp.userId },
            data: { permissions: stripped },
          });
        }
      }
    }
  } else {
    await prisma.vendorUser.deleteMany({ where: { userId: target.id } });
  }

  const updated = await prisma.user.findUnique({
    where: { id: target.id },
    include: {
      role: { select: { id: true, title: true } },
      vendor: { select: { id: true, title: true, uid: true } },
      vendorUserDetail: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(actor) && !isVendorAdmin(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isVendorAdmin(actor) && !hasVendorPermission(actor, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = normalizeString(new URL(req.url).searchParams.get("userId"));
  if (!userId)
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  if (userId === actor.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 403 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, roleId: true, vendorId: true, status: true },
  });
  if (!target || target.status === 5)
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!canManageTargetUser(actor, target))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.user.update({
    where: { id: target.id },
    data: { status: 5 },
  });
  await prisma.vendorUser.deleteMany({ where: { userId: target.id } });

  if (target.roleId === USER_ROLES.VENDOR && target.vendorId) {
    // Soft delete the vendor workspace
    await prisma.vendor.update({
      where: { id: target.vendorId },
      data: { status: 0 },
    });
    // Soft delete all employees under this vendor
    await prisma.user.updateMany({
      where: {
        vendorId: target.vendorId,
        id: { not: target.id },
        status: { not: 5 },
      },
      data: { status: 5 },
    });
    await prisma.vendorUser.deleteMany({
      where: { vendorId: target.vendorId },
    });
  }

  return NextResponse.json({ success: true });
}
