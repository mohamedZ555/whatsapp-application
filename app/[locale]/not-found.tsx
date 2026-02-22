import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function LocaleNotFoundPage() {
  const te = await getTranslations('errors');
  const tc = await getTranslations('common');
  const tn = await getTranslations('nav');

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
          404
        </div>
        <h1 className="text-2xl font-bold text-emerald-950">{te('notFound')}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {te('notFoundHint')}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {tn('dashboard')}
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {tc('back')}
          </Link>
        </div>
      </div>
    </div>
  );
}
