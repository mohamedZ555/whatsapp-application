import prisma from '@/lib/prisma';
import AdminPagesClient from './client';

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({ orderBy: { createdAt: 'desc' } });
  return <AdminPagesClient pages={pages} />;
}
