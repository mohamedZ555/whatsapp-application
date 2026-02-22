import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import LocaleSwitcher from '@/components/layout/locale-switcher';
import { PLANS } from '@/lib/constants';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  const coreFeatures = [
    { key: 'campaigns', icon: 'Megaphone' },
    { key: 'automation', icon: 'Workflow' },
    { key: 'ai', icon: 'Sparkles' },
    { key: 'team', icon: 'Users' },
    { key: 'analytics', icon: 'Chart' },
    { key: 'api', icon: 'Plug' },
  ];

  const flowSteps = ['connect', 'contacts', 'campaign', 'insights'] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-gray-900">
      <nav className="sticky top-0 z-20 border-b border-emerald-100/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 text-white font-bold">
              F
            </div>
            <span className="text-lg font-bold">FadaaWhats</span>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('hero.login')}
            </Link>
            <Link href="/register" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">
              {t('hero.getStarted')}
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-800">
            {t('hero.badge')}
          </p>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight md:text-5xl">{t('hero.title')}</h1>
          <p className="mb-8 max-w-xl text-lg text-gray-600">{t('hero.subtitle')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="rounded-xl bg-green-500 px-6 py-3 font-semibold text-white hover:bg-green-600">
              {t('hero.getStarted')}
            </Link>
            <Link href="/login" className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50">
              {t('hero.login')}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <p className="text-2xl font-bold text-emerald-700">99.9%</p>
              <p className="text-xs text-gray-500">{t('hero.stats.uptime')}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <p className="text-2xl font-bold text-emerald-700">150+</p>
              <p className="text-xs text-gray-500">{t('hero.stats.integrations')}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <p className="text-2xl font-bold text-emerald-700">24/7</p>
              <p className="text-xs text-gray-500">{t('hero.stats.support')}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/50">
          <h3 className="mb-4 text-lg font-semibold">{t('hero.panelTitle')}</h3>
          <div className="space-y-3">
            {flowSteps.map((step) => (
              <div key={step} className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t(`flow.${step}.title`)}</p>
                <p className="mt-1 text-sm text-gray-700">{t(`flow.${step}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">{t('features.title')}</h2>
          <p className="mt-2 text-gray-600">{t('features.subtitle')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coreFeatures.map((feature) => (
            <article key={feature.key} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 inline-flex rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t(`features.${feature.key}`)}</h3>
              <p className="text-sm text-gray-600">{t(`features.${feature.key}Desc`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold">{t('pricing.title')}</h2>
          <p className="mb-10 mt-2 text-center text-gray-600">{t('pricing.subtitle')}</p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {Object.values(PLANS).map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border bg-white p-6 ${
                  plan.id === 'plan_2' ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'
                }`}
              >
                <p className="mb-1 text-lg font-bold">{plan.title}</p>
                <p className="text-3xl font-extrabold">
                  ${plan.pricing.monthly}
                  <span className="text-sm font-medium text-gray-500"> / {t('pricing.perMonth')}</span>
                </p>
                <ul className="my-4 space-y-1 text-sm text-gray-600">
                  <li>{t('pricing.contacts')}: {plan.features.contacts === -1 ? t('pricing.unlimited') : plan.features.contacts}</li>
                  <li>{t('pricing.campaigns')}: {plan.features.campaignsPerMonth === -1 ? t('pricing.unlimited') : plan.features.campaignsPerMonth}</li>
                  <li>{t('pricing.team')}: {plan.features.teamMembers === -1 ? t('pricing.unlimited') : plan.features.teamMembers}</li>
                </ul>
                <Link href="/register" className="block rounded-lg bg-green-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-green-600">
                  {t('hero.getStarted')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('cta.title')}</h2>
            <p className="mt-2 text-gray-700">{t('cta.subtitle')}</p>
          </div>
          <Link href="/register" className="mt-5 inline-block rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 md:mt-0">
            {t('cta.action')}
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        <div className="mb-4 flex justify-center gap-6">
          <Link href="/page/terms" className="hover:text-gray-700">{t('footer.terms')}</Link>
          <Link href="/page/privacy" className="hover:text-gray-700">{t('footer.privacy')}</Link>
          <Link href="/contact" className="hover:text-gray-700">{t('footer.contact')}</Link>
        </div>
        <p>© {new Date().getFullYear()} FadaaWhats. {t('footer.rights')}</p>
      </footer>
    </div>
  );
}
