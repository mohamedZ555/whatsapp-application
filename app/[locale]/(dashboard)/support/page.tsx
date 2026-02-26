import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { USER_ROLES } from '@/lib/constants';
import prisma from '@/lib/prisma';
import VendorSupportClient from './client';

export default async function VendorSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { roleId?: number; vendorId?: string };
  if (user.roleId !== USER_ROLES.VENDOR) redirect('/dashboard');

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 15;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { vendorId: user.vendorId! },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.supportTicket.count({ where: { vendorId: user.vendorId! } }),
  ]);

  return <VendorSupportClient tickets={tickets} total={total} page={page} limit={limit} />;
}
