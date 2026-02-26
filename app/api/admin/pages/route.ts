import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

function requireAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>) {
  const user = session?.user as { roleId?: number } | undefined;
  return user?.roleId === USER_ROLES.SUPER_ADMIN;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const pages = await prisma.page.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { title, slug, content, showInMenu, status } = await req.json();
  if (!title?.trim() || !slug?.trim()) return NextResponse.json({ error: 'Title and slug required.' }, { status: 400 });
  const page = await prisma.page.create({
    data: { title: title.trim(), slug: slug.trim(), content: content ?? '', showInMenu: showInMenu ?? false, status: status ?? 1 },
  });
  return NextResponse.json({ page });
}
