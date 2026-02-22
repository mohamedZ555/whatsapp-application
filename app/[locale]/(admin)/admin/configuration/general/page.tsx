import prisma from '@/lib/prisma';

export default async function AdminConfigurationGeneralPage() {
  const configs = await prisma.configuration.findMany({ orderBy: { configKey: 'asc' } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">General Configuration</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((cfg) => (
          <div key={cfg.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">{cfg.configKey}</p>
            <p className="text-sm text-gray-900 mt-1 break-all">{cfg.configValue ?? 'N/A'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
