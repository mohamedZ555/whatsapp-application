import { getTranslations } from 'next-intl/server';

export default async function AdminTranslationsPage() {
  const tAdmin = await getTranslations('admin');
  return (
    <div className="max-w-3xl bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
      <h1 className="text-3xl font-bold text-emerald-950 mb-3">{tAdmin('translations')}</h1>
      <p className="text-sm text-slate-600 mb-3">
        {tAdmin('translationsHintPrefix')}{' '}
        <code className="bg-emerald-50 rounded px-1.5 py-0.5">messages/en.json</code> {tAdmin('and')}{' '}
        <code className="bg-emerald-50 rounded px-1.5 py-0.5">messages/ar.json</code>.
      </p>
      <p className="text-sm text-slate-600">{tAdmin('translationsHintSuffix')}</p>
    </div>
  );
}
