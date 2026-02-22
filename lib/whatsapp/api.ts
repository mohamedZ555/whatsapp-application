const BASE_URL = 'https://graph.facebook.com/v22.0';

function getHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
) {
  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  return res.json();
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string,
  components?: any[]
) {
  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    }),
  });
  return res.json();
}

export async function sendMediaMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  mediaType: 'image' | 'video' | 'document' | 'audio' | 'sticker',
  mediaUrl: string,
  caption?: string,
  filename?: string
) {
  const mediaObj: any = { link: mediaUrl };
  if (caption) mediaObj.caption = caption;
  if (filename) mediaObj.filename = filename;

  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: mediaObj,
    }),
  });
  return res.json();
}

export async function sendInteractiveMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  interactive: any
) {
  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive,
    }),
  });
  return res.json();
}

export async function getTemplates(
  businessAccountId: string,
  accessToken: string
) {
  const res = await fetch(`${BASE_URL}/${businessAccountId}/message_templates`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

export async function getPhoneNumbers(
  businessAccountId: string,
  accessToken: string
) {
  const res = await fetch(`${BASE_URL}/${businessAccountId}/phone_numbers`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

export async function markMessageAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
) {
  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
  return res.json();
}

export async function getMediaUrl(mediaId: string, accessToken: string) {
  const res = await fetch(`${BASE_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}
