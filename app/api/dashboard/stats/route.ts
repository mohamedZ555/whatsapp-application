import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getActorFromSession,
  isSuperAdmin,
  resolveOptionalVendorFilter,
} from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendorIdParam =
    new URL(req.url).searchParams.get("vendorId") ?? undefined;
  const vendorId = resolveOptionalVendorFilter(actor, vendorIdParam);

  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: "Vendor is required." }, { status: 400 });
  }

  const where = vendorId ? { vendorId } : {};

  // Core stats fetched for all roles
  const [
    totalContacts,
    totalMessages,
    activeCampaigns,
    subscription,
    recentMessages,
    deliveryStats,
  ] = await Promise.all([
    prisma.contact.count({ where: { ...where, status: 1 } }),
    prisma.whatsappMessageLog.count({ where }),
    prisma.campaign.count({ where: { ...where, status: { in: [1, 2] } } }),
    vendorId
      ? prisma.subscription.findFirst({
          where: { vendorId, status: "active" },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
    prisma.whatsappMessageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        contact: { select: { firstName: true, lastName: true, waId: true } },
      },
    }),
    prisma.whatsappMessageLog.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
  ]);

  // Super‑admin exclusive platform stats
  let superAdminStats: {
    totalVendors?: number;
    activeSubscriptions?: number;
    pendingVendors?: number;
  } = {};

  if (isSuperAdmin(actor)) {
    const [totalVendors, activeSubscriptions, pendingVendors] =
      await Promise.all([
        prisma.vendor.count({ where: { status: { not: 0 } } }),
        prisma.subscription.count({ where: { status: "active" } }),
        prisma.vendor.count({ where: { status: 2 } }), // VENDOR_STATUS.PENDING = 2
      ]);
    superAdminStats = { totalVendors, activeSubscriptions, pendingVendors };
  }

  return NextResponse.json({
    totalContacts,
    totalMessages,
    activeCampaigns,
    planId: subscription?.planId ?? (vendorId ? "free" : "all"),
    recentMessages,
    deliveryStats,
    ...superAdminStats,
  });
}
