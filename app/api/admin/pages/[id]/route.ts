import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

function requireAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>) {
  const user = session?.user as { roleId?: number } | undefined;
  return user?.roleId === USER_ROLES.SUPER_ADMIN;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { title, slug, content, showInMenu, status } = await req.json();
  const page = await prisma.page.update({
    where: { id },
    data: { title: title?.trim(), slug: slug?.trim(), content, showInMenu, status },
  });
  return NextResponse.json({ page });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
