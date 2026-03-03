import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getActorFromSession,
  isSuperAdmin,
  isVendorAdmin,
  getContactScope,
} from "@/lib/rbac";

// DELETE /api/chat/clear?contactId=xxx — Clear all messages for a contact (admin/super-admin only)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins and super admins can clear chat history
  if (!isSuperAdmin(actor) && !isVendorAdmin(actor)) {
    return NextResponse.json(
      { error: "Forbidden. Only admins can clear chat history." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  if (!contactId)
    return NextResponse.json(
      { error: "contactId is required." },
      { status: 400 },
    );

  // Verify access
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, ...getContactScope(actor) },
  });
  if (!contact)
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  await prisma.whatsappMessageLog.deleteMany({ where: { contactId } });

  return NextResponse.json({ success: true });
}
