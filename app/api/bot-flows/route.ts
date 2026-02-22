import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkLimit } from '@/lib/permissions';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vendorIdParam = new URL(req.url).searchParams.get('vendorId') ?? undefined;
  const vendorId = isSuperAdmin(actor) ? vendorIdParam : actor.vendorId ?? undefined;
  if (!vendorId) return NextResponse.json([]);

  const flows = await prisma.botFlow.findMany({
    where: { vendorId, status: { not: 5 } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(flows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const vendorId = isSuperAdmin(actor) ? (body.vendorId as string | undefined) : actor.vendorId ?? undefined;
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  const canAdd = await checkLimit(vendorId, 'botFlows');
  if (!canAdd) return NextResponse.json({ error: 'Bot flow limit reached. Please upgrade.' }, { status: 403 });

  const flowName = String(body.flowName ?? '').trim();
  if (!flowName) return NextResponse.json({ error: 'flowName is required.' }, { status: 400 });

  const flow = await prisma.botFlow.create({
    data: {
      vendorId,
      flowName,
      description: body.description ? String(body.description) : null,
      status: typeof body.status === 'number' ? body.status : 1,
      data: body.data ?? {},
    },
  });

  return NextResponse.json({ success: true, data: flow });
}

