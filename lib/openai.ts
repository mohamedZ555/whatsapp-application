import OpenAI from 'openai';
import prisma from '@/lib/prisma';

async function getVendorOpenAIClient(vendorId: string): Promise<OpenAI | null> {
  const settings = await prisma.vendorSetting.findMany({
    where: { vendorId, settingKey: { in: ['open_ai_access_key', 'open_ai_organization_id'] } },
  });

  const apiKey = settings.find((s) => s.settingKey === 'open_ai_access_key')?.settingValue;
  if (!apiKey) return null;

  const org = settings.find((s) => s.settingKey === 'open_ai_organization_id')?.settingValue;

  return new OpenAI({ apiKey, organization: org ?? undefined });
}

export async function processAiReply(
  vendorId: string,
  contactId: string,
  incomingMessage: string
): Promise<string | null> {
  const openai = await getVendorOpenAIClient(vendorId);
  if (!openai) return null;

  const settings = await prisma.vendorSetting.findMany({
    where: {
      vendorId,
      settingKey: {
        in: ['open_ai_model_key', 'open_ai_bot_name', 'open_ai_embedded_training_data'],
      },
    },
  });

  const model = settings.find((s) => s.settingKey === 'open_ai_model_key')?.settingValue ?? 'gpt-3.5-turbo';
  const botName = settings.find((s) => s.settingKey === 'open_ai_bot_name')?.settingValue ?? 'AI Assistant';
  const trainingData = settings.find((s) => s.settingKey === 'open_ai_embedded_training_data')?.settingValue ?? '';

  // Get last 10 messages for conversation context
  const recentMessages = await prisma.whatsappMessageLog.findMany({
    where: { contactId, vendorId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are ${botName}. ${trainingData}`,
    },
    ...recentMessages.reverse().map((m) => ({
      role: m.isIncomingMessage ? ('user' as const) : ('assistant' as const),
      content: m.messageContent ?? '',
    })),
    { role: 'user', content: incomingMessage },
  ];

  const response = await openai.chat.completions.create({ model, messages });
  return response.choices[0]?.message?.content ?? null;
}
