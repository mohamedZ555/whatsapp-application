import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getActorFromSession,
  resolveOptionalVendorFilter,
  isSuperAdmin,
} from "@/lib/rbac";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payload = await req.json();
  const contactIds: string[] = Array.isArray(payload.contactIds)
    ? payload.contactIds
    : [];

  if (contactIds.length === 0) {
    return NextResponse.json(
      { error: "No contacts provided." },
      { status: 400 },
    );
  }

  const vendorId = resolveOptionalVendorFilter(actor, payload.vendorId);
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: "Vendor is required." }, { status: 400 });
  }

  // Verify campaign belongs to vendor
  const campaign = await prisma.campaign.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    select: { id: true, vendorId: true, scheduledAt: true, status: true },
  });
  if (!campaign)
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  // Cannot assign to a processing or cancelled campaign
  if (campaign.status === 2) {
    return NextResponse.json(
      {
        error:
          "Cannot assign contacts to a campaign that is currently processing.",
      },
      { status: 400 },
    );
  }
  if (campaign.status === 5) {
    return NextResponse.json(
      { error: "Cannot assign contacts to a cancelled campaign." },
      { status: 400 },
    );
  }

  // Get already queued contact IDs to avoid duplicates
  const existing = await prisma.whatsappMessageQueue.findMany({
    where: { campaignId: id },
    select: { contactId: true },
  });
  const existingContactIds = new Set(existing.map((q) => q.contactId));
  const newContactIds = contactIds.filter(
    (cId) => !existingContactIds.has(cId),
  );

  if (newContactIds.length === 0) {
    return NextResponse.json({
      success: true,
      added: 0,
      message: "All selected contacts are already assigned.",
    });
  }

  await prisma.whatsappMessageQueue.createMany({
    data: newContactIds.map((cId) => ({
      vendorId: campaign.vendorId,
      campaignId: campaign.id,
      contactId: cId,
      messageType: "template",
      status: 1,
      scheduledAt: campaign.scheduledAt ?? new Date(),
    })),
  });

  return NextResponse.json({ success: true, added: newContactIds.length });
}
