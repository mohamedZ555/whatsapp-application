import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';
import { getActorFromSession } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (actor.roleId !== USER_ROLES.SUPER_ADMIN && actor.roleId !== USER_ROLES.VENDOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const vendorId = actor.roleId === USER_ROLES.SUPER_ADMIN
    ? new URL(req.url).searchParams.get('vendorId') ?? actor.vendorId
    : actor.vendorId;
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  const settings = await prisma.vendorSetting.findMany({ where: { vendorId } });
  const map: Record<string, string | null> = {};
  for (const s of settings) map[s.settingKey] = s.settingValue;
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (actor.roleId !== USER_ROLES.SUPER_ADMIN && actor.roleId !== USER_ROLES.VENDOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const requestedVendorId = typeof body.vendorId === 'string' ? body.vendorId : null;
  const vendorId = actor.roleId === USER_ROLES.SUPER_ADMIN ? (requestedVendorId ?? actor.vendorId) : actor.vendorId;
  if (!vendorId) return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });

  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => key !== 'vendorId')
  );

  for (const [key, value] of Object.entries(payload)) {
    await prisma.vendorSetting.upsert({
      where: { vendorId_settingKey: { vendorId, settingKey: key } },
      update: { settingValue: value as string },
      create: { vendorId, settingKey: key, settingValue: value as string },
    });
  }
  return NextResponse.json({ success: true });
}
