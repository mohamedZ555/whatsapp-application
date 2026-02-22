import { getTranslations } from 'next-intl/server';

export default async function ContactPage() {
  const t = await getTranslations('landing.contact');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/50 to-white">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('title')}</h1>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('message')}</label>
              <textarea rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="button" className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              {t('send')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
