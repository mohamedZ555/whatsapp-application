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

  const { searchParams } = new URL(req.url);
  const vendorId = isSuperAdmin(actor) ? searchParams.get('vendorId') : actor.vendorId;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '25');
  const isIncoming = searchParams.get('isIncoming');
  const status = searchParams.get('status');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const where: any = vendorId ? { vendorId } : {};
  if (isIncoming !== null && isIncoming !== '') where.isIncomingMessage = isIncoming === 'true';
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    prisma.whatsappMessageLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { contact: { select: { firstName: true, lastName: true, waId: true } } },
    }),
    prisma.whatsappMessageLog.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
}
