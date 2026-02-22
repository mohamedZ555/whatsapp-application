import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function TemplateCreatePage() {
  const t = await getTranslations('templates');

  return (
    <div className="max-w-3xl bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('createTemplate')}</h1>
      <p className="text-sm text-gray-600 mb-5">
        Template creation is managed from WhatsApp Business Manager. After creating a template there,
        return here and use Sync Templates to pull approved templates into your workspace.
      </p>
      <div className="flex gap-3">
        <a
          href="https://business.facebook.com"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          Open Business Manager
        </a>
        <Link href="/templates" className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
          Back to Templates
        </Link>
      </div>
    </div>
  );
}
