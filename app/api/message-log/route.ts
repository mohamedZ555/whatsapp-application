import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin, resolveOptionalVendorFilter } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vendorId = resolveOptionalVendorFilter(actor, searchParams.get('vendorId'));
  if (!vendorId && !isSuperAdmin(actor)) {
    return NextResponse.json({ error: 'Vendor is required.' }, { status: 400 });
  }
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '25');
  const isIncoming = searchParams.get('isIncoming');
  const status = searchParams.get('status');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search')?.trim();

  const where: Prisma.WhatsappMessageLogWhereInput = vendorId ? { vendorId } : {};
  if (isIncoming !== null && isIncoming !== '') where.isIncomingMessage = isIncoming === 'true';
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  if (search) {
    where.contact = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { waId: { contains: search } },
      ],
    };
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
