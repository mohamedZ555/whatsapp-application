import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkLimit } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;

  const botReplies = await prisma.botReply.findMany({
    where: { vendorId, status: { not: 5 } },
    orderBy: { order: 'asc' },
    include: { botFlow: { select: { id: true, flowName: true } } },
  });
  return NextResponse.json(botReplies);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;

  const canAdd = await checkLimit(vendorId, 'botReplies');
  if (!canAdd) return NextResponse.json({ error: 'Bot reply limit reached. Please upgrade.' }, { status: 403 });

  const body = await req.json();
  const { replyName, triggerType, triggerSubject, replyMessage, replyType, botFlowId, data } = body;

  if (!replyName || !triggerType) return NextResponse.json({ error: 'Required fields missing.' }, { status: 400 });

  const count = await prisma.botReply.count({ where: { vendorId } });

  const reply = await prisma.botReply.create({
    data: {
      vendorId,
      replyName,
      triggerType,
      triggerSubject: triggerSubject ?? null,
      replyMessage: replyMessage ?? null,
      replyType: replyType ?? 'text',
      botFlowId: botFlowId ?? null,
      data: data ?? {},
      order: count,
    },
  });

  return NextResponse.json({ success: true, data: reply });
}
