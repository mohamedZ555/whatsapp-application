import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActorFromSession, getContactScope } from "@/lib/rbac";

const BASE_URL = "https://graph.facebook.com/v22.0";

/**
 * GET /api/chat/media?mediaId=xxx&contactId=yyy
 * Proxies WhatsApp media so the client can display it (image/video/audio) with auth.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mediaId = searchParams.get("mediaId");
  const contactId = searchParams.get("contactId");

  if (!mediaId || !contactId) {
    return NextResponse.json(
      { error: "mediaId and contactId are required." },
      { status: 400 },
    );
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, ...getContactScope(actor) },
  });
  if (!contact)
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  const settings = await prisma.vendorSetting.findMany({
    where: {
      vendorId: contact.vendorId,
      settingKey: { in: ["whatsapp_access_token"] },
    },
  });
  const accessToken = settings.find(
    (s) => s.settingKey === "whatsapp_access_token",
  )?.settingValue;

  if (!accessToken) {
    return NextResponse.json(
      { error: "WhatsApp not configured." },
      { status: 400 },
    );
  }

  try {
    const metaRes = await fetch(`${BASE_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meta = await metaRes.json();
    if (meta.error || !meta.url) {
      return NextResponse.json(
        { error: meta.error?.message ?? "Failed to get media URL." },
        { status: 400 },
      );
    }

    const mediaRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) {
      return NextResponse.json(
        { error: "Failed to download media." },
        { status: 502 },
      );
    }

    const blob = await mediaRes.blob();
    const contentType = mediaRes.headers.get("content-type") ?? meta.mime_type ?? "application/octet-stream";

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("Chat media proxy error:", e);
    return NextResponse.json(
      { error: "Failed to load media." },
      { status: 500 },
    );
  }
}
