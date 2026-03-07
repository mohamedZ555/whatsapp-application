import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActorFromSession, getContactScope } from "@/lib/rbac";

// Allow longer execution for large video uploads (e.g. Vercel serverless)
export const maxDuration = 60;

/** WhatsApp Cloud API video size limit: 16 MB */
const VIDEO_MAX_BYTES = 16 * 1024 * 1024;

/**
 * POST /api/chat/upload
 * Uploads a media file to WhatsApp's media API and returns the media ID + URL.
 * Body: multipart/form-data with 'file' field and 'contactId' field.
 * Videos: max 16MB, formats MP4/3GP preferred.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const contactId = formData.get("contactId") as string | null;

  if (!file || !contactId) {
    return NextResponse.json(
      { error: "file and contactId are required." },
      { status: 400 },
    );
  }

  const fileSize = file.size ?? 0;
  const isVideo = file.type.startsWith("video/");
  if (isVideo && fileSize > VIDEO_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Video is too large. Maximum size is 16 MB (${(fileSize / 1024 / 1024).toFixed(1)} MB selected).`,
      },
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

  // Upload to WhatsApp Media API (explicit filename helps video uploads)
  const fileName = file.name?.trim() || (isVideo ? "video.mp4" : "file");
  const uploadForm = new FormData();
  uploadForm.append("file", file, fileName);
  uploadForm.append("messaging_product", "whatsapp");

  const uploadRes = await fetch(
    `https://graph.facebook.com/v22.0/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: uploadForm,
    },
  );
  const uploadData = await uploadRes.json();

  if (uploadData.error || !uploadData.id) {
    const message = uploadData.error?.message ?? "Upload failed.";
    return NextResponse.json(
      { error: typeof message === "string" ? message : "Upload failed." },
      { status: 400 },
    );
  }

  // Get the public URL for the uploaded media
  const mediaRes = await fetch(
    `https://graph.facebook.com/v22.0/${uploadData.id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const mediaData = await mediaRes.json();

  return NextResponse.json({
    success: true,
    mediaId: uploadData.id,
    url: mediaData.url ?? null,
    mimeType: file.type,
    fileName: file.name,
  });
}
