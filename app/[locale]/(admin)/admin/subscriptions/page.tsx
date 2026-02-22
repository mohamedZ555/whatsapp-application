import prisma from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';

export default async function AdminSubscriptionsPage() {
  const tAdmin = await getTranslations('admin');
  const tCommon = await getTranslations('common');
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: 'desc' },
    include: { vendor: true },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold text-emerald-950">{tAdmin('subscriptions')}</h1>
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50/60 border-b border-emerald-100">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tAdmin('vendors')}</th>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tAdmin('plan')}</th>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tCommon('status')}</th>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tAdmin('startsAt')}</th>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tAdmin('endsAt')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-medium text-slate-900">{sub.vendor.title ?? sub.vendor.slug ?? sub.vendor.uid}</td>
                <td className="px-4 py-3 text-slate-600">{sub.planId}</td>
                <td className="px-4 py-3 text-slate-600">{sub.status}</td>
                <td className="px-4 py-3 text-slate-500">{sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : tCommon('na')}</td>
                <td className="px-4 py-3 text-slate-500">{sub.endsAt ? new Date(sub.endsAt).toLocaleDateString() : tCommon('na')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
