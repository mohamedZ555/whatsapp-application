import prisma from '@/lib/prisma';

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: 'desc' } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Title</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">In Menu</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-gray-900">{page.title}</td>
                <td className="px-4 py-3 text-gray-600">/{page.slug}</td>
                <td className="px-4 py-3 text-gray-600">{page.showInMenu ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-gray-600">{page.status === 1 ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
