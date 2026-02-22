import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).roleId !== USER_ROLES.VENDOR) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const vendorId = (session.user as any).vendorId;

  const settings = await prisma.vendorSetting.findMany({ where: { vendorId } });
  const map: Record<string, string | null> = {};
  for (const s of settings) map[s.settingKey] = s.settingValue;
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).roleId !== USER_ROLES.VENDOR) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const vendorId = (session.user as any).vendorId;

  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await prisma.vendorSetting.upsert({
      where: { vendorId_settingKey: { vendorId, settingKey: key } },
      update: { settingValue: value as string },
      create: { vendorId, settingKey: key, settingValue: value as string },
    });
  }
  return NextResponse.json({ success: true });
}
