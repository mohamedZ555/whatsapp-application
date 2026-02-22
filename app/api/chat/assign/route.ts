import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, getContactScope, isVendorEmployee } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isVendorEmployee(actor)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { contactId, assignedUserId } = await req.json();
  if (!contactId) return NextResponse.json({ error: 'contactId is required.' }, { status: 400 });

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, ...getContactScope(actor) },
    select: { id: true, vendorId: true },
  });
  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  if (!assignedUserId) {
    const updated = await prisma.contact.update({
      where: { id: contact.id },
      data: { assignedUserId: null },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  const assignee = await prisma.user.findFirst({
    where: { id: assignedUserId, vendorId: contact.vendorId, status: 1 },
    select: { id: true },
  });
  if (!assignee) return NextResponse.json({ error: 'Assigned user not found.' }, { status: 400 });

  const updated = await prisma.contact.update({
    where: { id: contact.id },
    data: { assignedUserId: assignee.id },
  });

  return NextResponse.json({ success: true, data: updated });
}

