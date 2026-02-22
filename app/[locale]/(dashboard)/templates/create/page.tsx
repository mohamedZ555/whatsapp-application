import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function TemplateCreatePage() {
  const t = await getTranslations('templates');
  const tc = await getTranslations('common');

  return (
    <div className="max-w-3xl bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('createTemplate')}</h1>
      <p className="text-sm text-gray-600 mb-5">
        {t('createTemplateHint')}
      </p>
      <div className="flex gap-3">
        <a
          href="https://business.facebook.com"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          {t('openBusinessManager')}
        </a>
        <Link href="/templates" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
          {tc('back')}
        </Link>
      </div>
    </div>
  );
}
