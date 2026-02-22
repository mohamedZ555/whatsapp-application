import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/prisma';

export default async function AdminDashboardPage() {
  const t = await getTranslations('admin');

  const [totalVendors, activeSubscriptions, totalMessages] = await Promise.all([
    prisma.vendor.count({ where: { status: 1 } }),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.whatsappMessageLog.count(),
  ]);

  const stats = [
    { label: t('totalVendors'), value: totalVendors, icon: '🏢' },
    { label: t('activeSubscriptions'), value: activeSubscriptions, icon: '💎' },
    { label: t('totalMessages'), value: totalMessages, icon: '💬' },
  ];

  const recentVendors = await prisma.vendor.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      subscriptions: { where: { status: 'active' }, take: 1 },
      _count: { select: { contacts: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('dashboard')}</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">Recent Vendors</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Vendor</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Plan</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Contacts</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recentVendors.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium">{v.title ?? v.uid}</td>
                <td className="px-4 py-3 text-gray-600">{v.subscriptions[0]?.planId ?? 'free'}</td>
                <td className="px-4 py-3 text-gray-600">{v._count.contacts}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(v.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
