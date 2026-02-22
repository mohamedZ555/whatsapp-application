import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin, isVendorAdmin, isVendorEmployee } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vendorIdFromQuery = new URL(req.url).searchParams.get('vendorId') ?? undefined;
  let vendorId: string | undefined;

  if (isSuperAdmin(actor)) {
    vendorId = vendorIdFromQuery;
  } else if (isVendorAdmin(actor) || isVendorEmployee(actor)) {
    vendorId = actor.vendorId ?? undefined;
  }

  if (!vendorId) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: { vendorId, status: 1, roleId: { in: [2, 3] } },
    select: { id: true, firstName: true, lastName: true, email: true, roleId: true },
    orderBy: [{ roleId: 'asc' }, { firstName: 'asc' }],
  });

  return NextResponse.json(users);
}

