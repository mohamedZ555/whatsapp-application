import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  if (user.roleId !== USER_ROLES.SUPER_ADMIN) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') ?? '25')));
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const type = searchParams.get('type') ?? '';
  const vendorId = searchParams.get('vendorId') ?? '';

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (vendorId) where.vendorId = vendorId;
  if (search) {
    where.vendor = {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { vendor: { select: { id: true, uid: true, title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total });
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const { vendorId, type, amount, currency, status, description, planId, billingCycle } = body;

  if (!vendorId || !amount || !type) {
    return NextResponse.json({ error: 'vendorId, type, and amount are required' }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      vendorId,
      type: type ?? 'manual',
      amount: parseFloat(amount),
      currency: currency ?? 'USD',
      status: status ?? 'completed',
      description: description ?? null,
      planId: planId ?? null,
      billingCycle: billingCycle ?? null,
    },
    include: { vendor: { select: { id: true, uid: true, title: true, slug: true } } },
  });

  return NextResponse.json({ success: true, transaction });
}

export async function PUT(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const { id, status, description, amount, currency } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
      ...(currency !== undefined ? { currency } : {}),
    },
  });

  return NextResponse.json({ success: true, transaction });
}

export async function DELETE(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
