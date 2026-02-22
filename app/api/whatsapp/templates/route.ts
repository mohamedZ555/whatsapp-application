import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = isSuperAdmin(actor)
    ? new URL(req.url).searchParams.get('vendorId')
    : actor.vendorId;

  const templates = await prisma.whatsappTemplate.findMany({
    where: vendorId ? { vendorId } : {},
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(templates);
}
