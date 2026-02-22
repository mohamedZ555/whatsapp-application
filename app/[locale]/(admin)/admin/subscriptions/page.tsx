import prisma from '@/lib/prisma';

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: 'desc' },
    include: { vendor: true },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Vendor</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Plan</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Start</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-gray-900">{sub.vendor.title ?? sub.vendor.slug ?? sub.vendor.uid}</td>
                <td className="px-4 py-3 text-gray-600">{sub.planId}</td>
                <td className="px-4 py-3 text-gray-600">{sub.status}</td>
                <td className="px-4 py-3 text-gray-500">{sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : 'N/A'}</td>
                <td className="px-4 py-3 text-gray-500">{sub.endsAt ? new Date(sub.endsAt).toLocaleDateString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
