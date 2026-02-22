import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkLimit } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vendorId = (session.user as any).vendorId;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '25');
  const search = searchParams.get('search') ?? '';
  const groupId = searchParams.get('groupId');

  const where: any = { vendorId, status: { not: 5 } };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { waId: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (groupId) {
    where.groups = { some: { contactGroupId: groupId } };
  }

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        groups: { include: { contactGroup: { select: { id: true, name: true, color: true } } } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vendorId = (session.user as any).vendorId;

  const canAdd = await checkLimit(vendorId, 'contacts');
  if (!canAdd) return NextResponse.json({ error: 'Contact limit reached. Please upgrade.' }, { status: 403 });

  const body = await req.json();
  const { firstName, lastName, email, waId, phoneNumber, countryId, groupIds } = body;

  if (!waId) return NextResponse.json({ error: 'Phone number (waId) is required.' }, { status: 400 });

  const existing = await prisma.contact.findUnique({ where: { vendorId_waId: { vendorId, waId } } });
  if (existing) return NextResponse.json({ error: 'Contact with this number already exists.' }, { status: 409 });

  const contact = await prisma.contact.create({
    data: {
      vendorId,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      email: email ?? null,
      waId,
      phoneNumber: phoneNumber ?? null,
      countryId: countryId ?? null,
    },
  });

  if (groupIds?.length) {
    await prisma.groupContact.createMany({
      data: groupIds.map((gId: string) => ({ contactId: contact.id, contactGroupId: gId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ success: true, data: contact });
}
