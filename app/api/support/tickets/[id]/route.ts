import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { roleId?: number; vendorId?: string };
  const { id } = await params;

  const where = user.roleId === USER_ROLES.SUPER_ADMIN
    ? { id }
    : { id, vendorId: user.vendorId! };

  const ticket = await prisma.supportTicket.findFirst({
    where,
    include: {
      replies: { orderBy: { createdAt: 'asc' } },
      vendor: { select: { id: true, title: true, uid: true } },
    },
  });

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { roleId?: number; vendorId?: string };
  const { id } = await params;
  const { content } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: 'Content required.' }, { status: 400 });

  const isAdmin = user.roleId === USER_ROLES.SUPER_ADMIN;

  const where = isAdmin ? { id } : { id, vendorId: user.vendorId! };
  const ticket = await prisma.supportTicket.findFirst({ where });
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [reply] = await prisma.$transaction([
    prisma.supportTicketReply.create({
      data: { ticketId: id, content: content.trim(), isAdmin },
    }),
    prisma.supportTicket.update({
      where: { id },
      data: { status: isAdmin ? 'in_progress' : 'open', updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ reply });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { roleId?: number };
  if (user.roleId !== USER_ROLES.SUPER_ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { status, updatedAt: new Date() },
  });

  return NextResponse.json({ ticket });
}
