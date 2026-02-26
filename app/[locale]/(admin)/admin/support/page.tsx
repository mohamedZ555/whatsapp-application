import prisma from '@/lib/prisma';
import AdminSupportClient from './client';

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? '';
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 25;
  const where = status ? { status } : {};

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        vendor: { select: { id: true, title: true, uid: true } },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return (
    <AdminSupportClient
      tickets={tickets}
      total={total}
      page={page}
      limit={limit}
      statusFilter={status}
    />
  );
}
