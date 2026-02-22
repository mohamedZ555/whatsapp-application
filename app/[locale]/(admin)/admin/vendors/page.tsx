import prisma from '@/lib/prisma';

export default async function AdminVendorsPage() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, contacts: true } },
      subscriptions: { where: { status: 'active' }, take: 1 },
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Plan</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Users</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Contacts</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-gray-900">{v.title ?? v.slug ?? v.uid}</td>
                <td className="px-4 py-3 text-gray-600">{v.subscriptions[0]?.planId ?? 'free'}</td>
                <td className="px-4 py-3 text-gray-600">{v._count.users}</td>
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
