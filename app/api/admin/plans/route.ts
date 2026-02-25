import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';
import { getServerPlans } from '@/lib/plans';

export async function GET() {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const plans = await getServerPlans();
  return NextResponse.json({ plans });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { plans } = body;
  if (!plans || typeof plans !== 'object') {
    return NextResponse.json({ error: 'plans object is required.' }, { status: 400 });
  }

  await prisma.configuration.upsert({
    where: { configKey: 'plans_config' },
    create: { configKey: 'plans_config', configValue: JSON.stringify(plans) },
    update: { configValue: JSON.stringify(plans) },
  });

  return NextResponse.json({ success: true });
}
