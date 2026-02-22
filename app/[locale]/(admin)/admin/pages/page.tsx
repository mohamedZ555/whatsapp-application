import prisma from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';

export default async function AdminPagesPage() {
  const tAdmin = await getTranslations('admin');
  const tCommon = await getTranslations('common');
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: 'desc' } });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold text-emerald-950">{tAdmin('pages')}</h1>
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50/60 border-b border-emerald-100">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tAdmin('titleColumn')}</th>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tAdmin('slug')}</th>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tAdmin('inMenu')}</th>
              <th className="text-start px-4 py-3 font-medium text-slate-600">{tCommon('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-medium text-slate-900">{page.title}</td>
                <td className="px-4 py-3 text-slate-600">/{page.slug}</td>
                <td className="px-4 py-3 text-slate-600">{page.showInMenu ? tCommon('yes') : tCommon('no')}</td>
                <td className="px-4 py-3 text-slate-600">{page.status === 1 ? tCommon('active') : tCommon('inactive')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
