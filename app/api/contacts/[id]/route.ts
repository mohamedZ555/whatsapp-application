import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;
  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, vendorId },
    include: {
      groups: { include: { contactGroup: true } },
      labels: { include: { label: true } },
      customFieldValues: { include: { customField: true } },
    },
  });
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;
  const { id } = await params;
  const body = await req.json();

  const contact = await prisma.contact.findFirst({ where: { id, vendorId } });
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      firstName: body.firstName ?? contact.firstName,
      lastName: body.lastName ?? contact.lastName,
      email: body.email ?? contact.email,
      phoneNumber: body.phoneNumber ?? contact.phoneNumber,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const vendorId = (session.user as any).vendorId;
  const { id } = await params;

  const contact = await prisma.contact.findFirst({ where: { id, vendorId } });
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.contact.update({ where: { id }, data: { status: 5 } });
  return NextResponse.json({ success: true });
}
