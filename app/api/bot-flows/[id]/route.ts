import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

function flowScope(actor: ReturnType<typeof getActorFromSession>, id: string, vendorId?: string) {
  if (!actor) return { id: '__forbidden__' };
  if (isSuperAdmin(actor)) {
    return vendorId ? { id, vendorId } : { id };
  }
  if (!actor.vendorId) return { id: '__forbidden__' };
  return { id, vendorId: actor.vendorId };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const vendorIdParam = new URL(req.url).searchParams.get('vendorId') ?? undefined;
  const flow = await prisma.botFlow.findFirst({
    where: flowScope(actor, id, vendorIdParam),
  });
  if (!flow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(flow);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const vendorIdParam = body.vendorId as string | undefined;
  const existing = await prisma.botFlow.findFirst({
    where: flowScope(actor, id, vendorIdParam),
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.botFlow.update({
    where: { id },
    data: {
      flowName: body.flowName ? String(body.flowName) : undefined,
      description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
      status: typeof body.status === 'number' ? body.status : undefined,
      jobCategoryId: body.jobCategoryId !== undefined ? (body.jobCategoryId ? String(body.jobCategoryId) : null) : undefined,
      data: body.data !== undefined ? body.data : undefined,
    },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const vendorIdParam = new URL(req.url).searchParams.get('vendorId') ?? undefined;
  const existing = await prisma.botFlow.findFirst({
    where: flowScope(actor, id, vendorIdParam),
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.botFlow.update({
    where: { id },
    data: { status: 5 },
  });
  return NextResponse.json({ success: true });
}

