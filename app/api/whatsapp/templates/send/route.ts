import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendTemplateMessage } from "@/lib/whatsapp/api";
import { getActorFromSession, resolveOptionalVendorFilter } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { contactId, templateId, components } = body;

  if (!contactId || !templateId) {
    return NextResponse.json(
      { error: "contactId and templateId are required." },
      { status: 400 },
    );
  }

  const vendorId = resolveOptionalVendorFilter(actor, null);

  const [contact, template] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: contactId, ...(vendorId ? { vendorId } : {}) },
    }),
    prisma.whatsappTemplate.findFirst({
      where: { id: templateId, ...(vendorId ? { vendorId } : {}) },
    }),
  ]);

  if (!contact)
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  if (!template)
    return NextResponse.json({ error: "Template not found." }, { status: 404 });

  const settings = await prisma.vendorSetting.findMany({
    where: {
      vendorId: contact.vendorId,
      settingKey: { in: ["whatsapp_access_token", "current_phone_number_id"] },
    },
  });
  const accessToken = settings.find(
    (s) => s.settingKey === "whatsapp_access_token",
  )?.settingValue;
  const phoneNumberId = settings.find(
    (s) => s.settingKey === "current_phone_number_id",
  )?.settingValue;

  if (!accessToken || !phoneNumberId) {
    return NextResponse.json(
      { error: "WhatsApp not configured." },
      { status: 400 },
    );
  }

  const result = await sendTemplateMessage(
    phoneNumberId,
    accessToken,
    contact.waId,
    template.templateName,
    template.languageCode,
    components ?? [],
  );

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message ?? "Failed to send." },
      { status: 400 },
    );
  }

  // Log the message
  await prisma.whatsappMessageLog
    .create({
      data: {
        vendorId: contact.vendorId,
        contactId: contact.id,
        messageType: "template",
        isIncomingMessage: false,
        data: { templateName: template.templateName, components },
        status: "sent",
      },
    })
    .catch(() => null);

  return NextResponse.json({ success: true, data: result });
}
