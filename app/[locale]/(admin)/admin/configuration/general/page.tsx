import prisma from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';

export default async function AdminConfigurationGeneralPage() {
  const tAdmin = await getTranslations('admin');
  const tCommon = await getTranslations('common');
  const configs = await prisma.configuration.findMany({ orderBy: { configKey: 'asc' } });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold text-emerald-950">{tAdmin('generalConfiguration')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((cfg) => (
          <div key={cfg.id} className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
            <p className="text-xs text-slate-500">{cfg.configKey}</p>
            <p className="text-sm text-slate-900 mt-1 break-all">{cfg.configValue ?? tCommon('na')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
