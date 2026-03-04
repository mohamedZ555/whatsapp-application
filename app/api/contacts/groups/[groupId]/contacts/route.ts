import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getActorFromSession,
  isSuperAdmin,
  resolveOptionalVendorFilter,
} from "@/lib/rbac";

/* POST — assign contacts to a group */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const body = await req.json();
  const contactIds: string[] = Array.isArray(body.contactIds)
    ? body.contactIds
    : [];
  if (contactIds.length === 0)
    return NextResponse.json(
      { error: "No contacts provided." },
      { status: 400 },
    );

  const vendorId = resolveOptionalVendorFilter(actor);
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: "Vendor is required." }, { status: 400 });
  }

  // Verify group ownership
  const group = await prisma.contactGroup.findFirst({
    where: { id: groupId, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!group)
    return NextResponse.json({ error: "Group not found." }, { status: 404 });

  // Create links, skip duplicates
  await prisma.groupContact.createMany({
    data: contactIds.map((cId) => ({
      contactId: cId,
      contactGroupId: groupId,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true });
}

/* GET — list contacts in a group */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const vendorId = resolveOptionalVendorFilter(actor);
  if (!vendorId && !isSuperAdmin(actor)) return NextResponse.json([]);

  const group = await prisma.contactGroup.findFirst({
    where: { id: groupId, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!group)
    return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const links = await prisma.groupContact.findMany({
    where: { contactGroupId: groupId },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          waId: true,
          phoneNumber: true,
        },
      },
    },
  });

  return NextResponse.json(links.map((l) => l.contact));
}

/* DELETE — remove contacts from a group */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const body = await req.json();
  const contactIds: string[] = Array.isArray(body.contactIds)
    ? body.contactIds
    : [];
  if (contactIds.length === 0)
    return NextResponse.json(
      { error: "No contacts provided." },
      { status: 400 },
    );

  const vendorId = resolveOptionalVendorFilter(actor);
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: "Vendor is required." }, { status: 400 });
  }

  // Verify group ownership
  const group = await prisma.contactGroup.findFirst({
    where: { id: groupId, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!group)
    return NextResponse.json({ error: "Group not found." }, { status: 404 });

  await prisma.groupContact.deleteMany({
    where: {
      contactGroupId: groupId,
      contactId: { in: contactIds },
    },
  });

  return NextResponse.json({ success: true });
}
