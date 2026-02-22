import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkLimit } from '@/lib/permissions';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorIdParam = new URL(req.url).searchParams.get('vendorId') ?? undefined;
  const vendorId = isSuperAdmin(actor) ? (vendorIdParam ?? actor.vendorId ?? undefined) : actor.vendorId ?? undefined;
  if (!vendorId) return NextResponse.json([]);

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
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const vendorId = isSuperAdmin(actor) ? (body.vendorId ?? actor.vendorId) : actor.vendorId;
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  const canAdd = await checkLimit(vendorId, 'botReplies');
  if (!canAdd) return NextResponse.json({ error: 'Bot reply limit reached. Please upgrade.' }, { status: 403 });

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
