import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import { getMessages } from 'next-intl/server';
import Providers from '@/components/providers';
import { PLANS } from '@/lib/constants';

export default async function LandingPage() {
  const t = await getTranslations('landing');
  const tc = await getTranslations('common');
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <Providers locale={locale} messages={messages}>
          <div className="min-h-screen bg-white">
            {/* Nav */}
            <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-900 text-lg">FadaaWhats</span>
              </div>
              <div className="flex gap-3">
                <Link href="/login" className="px-4 py-2 text-sm text-gray-700 hover:text-green-600">{t('hero.login')}</Link>
                <Link href="/register" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">{t('hero.getStarted')}</Link>
              </div>
            </nav>

            {/* Hero */}
            <section className="max-w-7xl mx-auto px-6 py-24 text-center">
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">{t('hero.title')}</h1>
              <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">{t('hero.subtitle')}</p>
              <div className="flex gap-4 justify-center">
                <Link href="/register" className="px-8 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors">{t('hero.getStarted')}</Link>
                <Link href="/login" className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">{t('hero.login')}</Link>
              </div>
            </section>

            {/* Pricing */}
            <section className="bg-gray-50 py-20 px-6">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">{t('pricing.title')}</h2>
                <p className="text-center text-gray-500 mb-12">{t('pricing.subtitle')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.values(PLANS).map((plan) => (
                    <div key={plan.id} className={`bg-white rounded-2xl border p-6 shadow-sm ${plan.id === 'plan_2' ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-100'}`}>
                      {plan.id === 'plan_2' && <div className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">{t('pricing.mostPopular')}</div>}
                      <h3 className="font-bold text-xl text-gray-900 mb-2">{plan.title}</h3>
                      <p className="text-4xl font-bold text-gray-900 mb-1">${plan.pricing.monthly}<span className="text-base font-normal text-gray-400">/mo</span></p>
                      <Link href="/register" className="block w-full mt-5 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold text-center hover:bg-green-600">
                        {t('hero.getStarted')}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-400">
              <div className="flex gap-6 justify-center">
                <Link href="/page/terms" className="hover:text-gray-600">{t('footer.terms')}</Link>
                <Link href="/page/privacy" className="hover:text-gray-600">{t('footer.privacy')}</Link>
                <Link href="/contact" className="hover:text-gray-600">{t('footer.contact')}</Link>
              </div>
              <p className="mt-4">© {new Date().getFullYear()} FadaaWhats. All rights reserved.</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
