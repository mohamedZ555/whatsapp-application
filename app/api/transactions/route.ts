import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  const vendorId = user.vendorId as string | undefined;
  const roleId = user.roleId as number | undefined;

  if (!vendorId || roleId === USER_ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25')));
  const status = searchParams.get('status') ?? '';
  const type = searchParams.get('type') ?? '';

  const where: any = { vendorId };
  if (status) where.status = status;
  if (type) where.type = type;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total });
}
