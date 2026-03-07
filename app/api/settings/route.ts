import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { USER_ROLES } from "@/lib/constants";
import { getActorFromSession, resolveRequiredVendorId } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    actor.roleId !== USER_ROLES.SUPER_ADMIN &&
    actor.roleId !== USER_ROLES.VENDOR
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const vendorId = resolveRequiredVendorId(
    actor,
    new URL(req.url).searchParams.get("vendorId"),
  );
  if (!vendorId)
    return NextResponse.json({ error: "Vendor is required." }, { status: 400 });

  const settings = await prisma.vendorSetting.findMany({ where: { vendorId } });
  const map: Record<string, string | null> = {};
  for (const s of settings) map[s.settingKey] = s.settingValue;

  if (actor.roleId === USER_ROLES.VENDOR) {
    const user = await prisma.user.findUnique({ where: { id: actor.userId } });
    if (user) {
      if (!map["contact_email"]) map["contact_email"] = user.email;
      if (!map["contact_phone"] && user.mobileNumber)
        map["contact_phone"] = user.mobileNumber;
      if (!map["name"])
        map["name"] = [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (vendor?.title) {
      map["name"] = vendor.title;
    }
  }

  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    actor.roleId !== USER_ROLES.SUPER_ADMIN &&
    actor.roleId !== USER_ROLES.VENDOR
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const requestedVendorId =
    typeof body.vendorId === "string" ? body.vendorId : null;
  const vendorId = resolveRequiredVendorId(actor, requestedVendorId);
  if (!vendorId)
    return NextResponse.json({ error: "Vendor is required." }, { status: 400 });

  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => key !== "vendorId"),
  );

  for (const [key, value] of Object.entries(payload)) {
    await prisma.vendorSetting.upsert({
      where: { vendorId_settingKey: { vendorId, settingKey: key } },
      update: { settingValue: value as string },
      create: { vendorId, settingKey: key, settingValue: value as string },
    });
  }

  if (payload.name) {
    await prisma.vendor.update({
      where: { id: vendorId },
      data: { title: String(payload.name) },
    });
  }

  if (actor.roleId === USER_ROLES.VENDOR) {
    const updateData: any = {};
    if (payload.name) {
      const parts = String(payload.name).trim().split(" ");
      updateData.firstName = parts[0] || "Admin";
      updateData.lastName = parts.slice(1).join(" ") || "";
    }
    if (payload.contact_email) {
      updateData.email = String(payload.contact_email).toLowerCase();
    }
    if (payload.contact_phone) {
      updateData.mobileNumber = String(payload.contact_phone);
    }

    if (Object.keys(updateData).length > 0) {
      if (updateData.email) {
        const existing = await prisma.user.findFirst({
          where: { email: updateData.email, id: { not: actor.userId } },
        });
        if (!existing) {
          await prisma.user.update({
            where: { id: actor.userId },
            data: updateData,
          });
        }
      } else {
        await prisma.user.update({
          where: { id: actor.userId },
          data: updateData,
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
