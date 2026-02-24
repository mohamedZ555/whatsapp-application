import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkLimit } from '@/lib/permissions';
import {
  getActorFromSession,
  isSuperAdmin,
  resolveOptionalVendorFilter,
  resolveRequiredVendorId,
  shouldBypassPlanLimits,
} from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorIdParam = new URL(req.url).searchParams.get('vendorId') ?? undefined;
  const vendorId = resolveOptionalVendorFilter(actor, vendorIdParam);
  if (!vendorId && !isSuperAdmin(actor)) return NextResponse.json([]);

  const botReplies = await prisma.botReply.findMany({
    where: {
      ...(vendorId ? { vendorId } : {}),
      status: { not: 5 },
    },
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
  const vendorId = resolveRequiredVendorId(actor, body.vendorId);
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  if (!shouldBypassPlanLimits(actor)) {
    const canAdd = await checkLimit(vendorId, 'botReplies');
    if (!canAdd) return NextResponse.json({ error: 'Bot reply limit reached. Please upgrade.' }, { status: 403 });
  }

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

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const vendorId = resolveOptionalVendorFilter(actor, body.vendorId);
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  }

  const existing = await prisma.botReply.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const updated = await prisma.botReply.update({
    where: { id },
    data: {
      replyName: body.replyName ? String(body.replyName) : undefined,
      triggerType: body.triggerType ? String(body.triggerType) : undefined,
      triggerSubject: body.triggerSubject !== undefined ? (body.triggerSubject ? String(body.triggerSubject) : null) : undefined,
      replyMessage: body.replyMessage !== undefined ? (body.replyMessage ? String(body.replyMessage) : null) : undefined,
      replyType: body.replyType ? String(body.replyType) : undefined,
      botFlowId: body.botFlowId !== undefined ? (body.botFlowId ? String(body.botFlowId) : null) : undefined,
      order: typeof body.order === 'number' ? body.order : undefined,
      status: typeof body.status === 'number' ? body.status : undefined,
      data: body.data !== undefined ? body.data : undefined,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const vendorId = resolveOptionalVendorFilter(actor, searchParams.get('vendorId'));
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  }

  const existing = await prisma.botReply.findFirst({
    where: { id, ...(vendorId ? { vendorId } : {}) },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await prisma.botReply.update({
    where: { id },
    data: { status: 5 },
  });

  return NextResponse.json({ success: true });
}
