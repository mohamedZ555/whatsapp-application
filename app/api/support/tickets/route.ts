import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { roleId?: number; vendorId?: string };
  if (user.roleId !== USER_ROLES.VENDOR) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = 20;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { vendorId: user.vendorId! },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { replies: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    prisma.supportTicket.count({ where: { vendorId: user.vendorId! } }),
  ]);

  return NextResponse.json({ tickets, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { roleId?: number; vendorId?: string };
  if (user.roleId !== USER_ROLES.VENDOR) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { subject, message, priority } = await req.json();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      vendorId: user.vendorId!,
      subject: subject.trim(),
      priority: priority ?? 'normal',
      replies: {
        create: { content: message.trim(), isAdmin: false },
      },
    },
    include: { replies: true },
  });

  return NextResponse.json({ ticket });
}
