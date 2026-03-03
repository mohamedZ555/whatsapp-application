import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPusherServer, PUSHER_EVENTS } from "@/lib/pusher";
import { getActorFromSession, getContactScope } from "@/lib/rbac";

const BASE_URL = "https://graph.facebook.com/v22.0";

async function sendWAMessage(
  phoneNumberId: string,
  accessToken: string,
  body: object,
) {
  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    contactId,
    messageType,
    messageContent,
    mediaId,
    mediaUrl,
    caption,
    fileName,
  } = await req.json();

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, ...getContactScope(actor) },
  });
  if (!contact)
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  const vendorId = contact.vendorId;

  const settings = await prisma.vendorSetting.findMany({
    where: {
      vendorId,
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

  let waResponse: any;

  if (messageType === "text") {
    waResponse = await sendWAMessage(phoneNumberId, accessToken, {
      to: contact.waId,
      type: "text",
      text: { body: messageContent },
    });
  } else if (["image", "video", "audio", "document"].includes(messageType)) {
    const mediaObj: any = mediaId ? { id: mediaId } : { link: mediaUrl };
    if (caption) mediaObj.caption = caption;
    if (fileName && messageType === "document") mediaObj.filename = fileName;
    waResponse = await sendWAMessage(phoneNumberId, accessToken, {
      to: contact.waId,
      type: messageType,
      [messageType]: mediaObj,
    });
  } else {
    return NextResponse.json(
      { error: "Unsupported message type." },
      { status: 400 },
    );
  }

  if (waResponse?.error) {
    return NextResponse.json(
      { error: waResponse.error.message ?? "WhatsApp API error." },
      { status: 400 },
    );
  }

  const log = await prisma.whatsappMessageLog.create({
    data: {
      vendorId,
      contactId,
      messageType: messageType ?? "text",
      messageContent: messageContent ?? caption ?? null,
      status: "sent",
      isIncomingMessage: false,
      waMessageId: waResponse?.messages?.[0]?.id ?? null,
      wabPhoneNumberId: phoneNumberId,
      data: mediaId
        ? { mediaId, fileName }
        : mediaUrl
          ? { mediaUrl, fileName }
          : undefined,
    },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: { messagedAt: new Date() },
  });

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { uid: true },
  });
  if (vendor && process.env.PUSHER_APP_ID) {
    try {
      await getPusherServer().trigger(
        `private-vendor-${vendor.uid}`,
        PUSHER_EVENTS.NEW_MESSAGE,
        { log },
      );
    } catch {}
  }

  return NextResponse.json({ success: true, data: log });
}
