import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function GET() {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const configs = await prisma.configuration.findMany({
    orderBy: { configKey: 'asc' },
  });

  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor || !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const pairs = body.configs as Array<{ configKey: string; configValue: string }>;

  if (!Array.isArray(pairs) || pairs.length === 0) {
    return NextResponse.json({ error: 'configs array is required.' }, { status: 400 });
  }

  // Upsert each config key/value pair
  await Promise.all(
    pairs.map(({ configKey, configValue }) =>
      prisma.configuration.upsert({
        where: { configKey },
        update: { configValue: configValue ?? null },
        create: { configKey, configValue: configValue ?? null },
      })
    )
  );

  return NextResponse.json({ success: true });
}
