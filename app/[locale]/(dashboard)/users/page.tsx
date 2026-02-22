import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('users');
  const tc = await getTranslations('common');

  const vendorId = (session?.user as any)?.vendorId as string | undefined;
  const users = vendorId
    ? await prisma.vendorUser.findMany({
        where: { vendorId },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} {tc('results')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50/60 border-b border-emerald-100">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('name')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('email')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('permissions')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{tc('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-400">
                  {tc('noData')}
                </td>
              </tr>
            )}
            {users.map((row) => {
              const permissions = (row.permissions as string[] | null) ?? [];
              return (
                <tr key={row.id} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.user.firstName} {row.user.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.user.email}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {permissions.length === 0 ? tc('na') : permissions.join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${row.user.status === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                      {row.user.status === 1 ? tc('active') : tc('inactive')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
