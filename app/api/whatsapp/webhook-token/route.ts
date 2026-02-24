import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, resolveRequiredVendorId } from '@/lib/rbac';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vendorId = resolveRequiredVendorId(actor, null);
  if (!vendorId) return NextResponse.json({ error: 'No vendor assigned.' }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { uid: true },
  });

  if (!vendor) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });

  const verifyToken = crypto.createHash('sha1').update(vendor.uid).digest('hex');

  return NextResponse.json({ verifyToken, vendorUid: vendor.uid });
}
