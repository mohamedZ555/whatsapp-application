import prisma from '@/lib/prisma';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { PLANS } from '@/lib/constants';

export default async function AdminDashboardPage() {
  const tAdmin = await getTranslations('admin');
  const [totalVendors, activeSubscriptions, totalMessages] = await Promise.all([
    prisma.vendor.count({ where: { status: 1 } }),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.whatsappMessageLog.count(),
  ]);

  const recentVendors = await prisma.vendor.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      subscriptions: { where: { status: 'active' }, take: 1 },
      _count: { select: { contacts: true } },
    },
  });

  const cards = [
    { label: tAdmin('totalVendors'), value: totalVendors },
    { label: tAdmin('activeSubscriptions'), value: activeSubscriptions },
    { label: tAdmin('totalMessages'), value: totalMessages },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950">{tAdmin('dashboard')}</h1>
          <p className="mt-1 text-sm text-slate-600">{tAdmin('dashboardSubtitle')}</p>
        </div>
        <Link
          href="/admin/vendors"
          className="rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {tAdmin('vendors')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{tAdmin('recentVendors')}</h2>
          <Link href="/admin/subscriptions" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            {tAdmin('subscriptions')}
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-emerald-50/60">
            <tr>
              <th className="px-4 py-3 text-start font-semibold text-slate-600">{tAdmin('vendors')}</th>
              <th className="px-4 py-3 text-start font-semibold text-slate-600">{tAdmin('plan')}</th>
              <th className="px-4 py-3 text-start font-semibold text-slate-600">{tAdmin('contacts')}</th>
              <th className="px-4 py-3 text-start font-semibold text-slate-600">{tAdmin('createdAt')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {recentVendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-medium text-slate-900">{vendor.title ?? vendor.uid}</td>
                <td className="px-4 py-3 text-slate-600">{PLANS[vendor.subscriptions[0]?.planId as keyof typeof PLANS]?.title ?? 'Free'}</td>
                <td className="px-4 py-3 text-slate-600">{vendor._count.contacts}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(vendor.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
