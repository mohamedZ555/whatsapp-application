import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import LocaleSwitcher from '@/components/layout/locale-switcher';
import { getServerPlans } from '@/lib/plans';
import PricingSection from './(landing)/pricing-section';

const FEATURES = [
  {
    key: 'campaigns',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    key: 'automation',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    key: 'ai',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    key: 'team',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'analytics',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'api',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

const TESTIMONIALS = [
  {
    name: 'Khaled Al-Mansouri',
    role: 'Marketing Director',
    company: 'RetailHub KSA',
    avatar: 'KA',
    color: 'bg-blue-500',
    text: 'FadaaWhats transformed how we reach our customers. We went from manually sending messages to fully automated campaigns in less than a week.',
  },
  {
    name: 'Sara Benali',
    role: 'Customer Success Lead',
    company: 'TechFlow Egypt',
    avatar: 'SB',
    color: 'bg-purple-500',
    text: 'The bot automation saved us 40% of support time. The Arabic RTL interface works flawlessly for our team.',
  },
  {
    name: 'Ahmed Nasser',
    role: 'Founder',
    company: 'GrowFast UAE',
    avatar: 'AN',
    color: 'bg-emerald-600',
    text: 'Incredible platform. The campaign analytics help us understand exactly what works. Best WhatsApp tool in the region.',
  },
];

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

const FLOW_STEPS = ['connect', 'contacts', 'campaign', 'insights'] as const;

export default async function LandingPage() {
  const t = await getTranslations('landing');
  const plans = await getServerPlans();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white text-gray-900">
      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-emerald-100/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 text-white font-bold text-sm">
              F
            </div>
            <span className="text-lg font-bold">FadaaWhats</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-green-600 transition-colors">{t('nav.features')}</a>
            <a href="#pricing" className="hover:text-green-600 transition-colors">{t('nav.pricing')}</a>
            <Link href="/contact" className="hover:text-green-600 transition-colors">{t('nav.contact')}</Link>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link href="/login" className="hidden sm:block rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('hero.login')}
            </Link>
            <Link href="/register" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">
              {t('hero.getStarted')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-800">
            {t('hero.badge')}
          </p>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mb-8 max-w-xl text-lg text-gray-500">{t('hero.subtitle')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="rounded-xl bg-green-500 px-7 py-3.5 font-semibold text-white hover:bg-green-600 transition-colors shadow-lg shadow-green-200">
              {t('hero.getStarted')}
            </Link>
            <Link href="/login" className="rounded-xl border border-gray-300 px-7 py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              {t('hero.login')}
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { val: '99.9%', key: 'uptime' },
              { val: '150+', key: 'integrations' },
              { val: '24/7', key: 'support' },
            ].map(({ val, key }) => (
              <div key={key} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-2xl font-bold text-emerald-700">{val}</p>
                <p className="mt-1 text-xs text-gray-500">{t(`hero.stats.${key}`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Flow panel */}
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-100/60">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <h3 className="mb-5 mt-3 text-base font-semibold text-gray-800">{t('hero.panelTitle')}</h3>
          <div className="space-y-3">
            {FLOW_STEPS.map((step, i) => (
              <div key={step} className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t(`flow.${step}.title`)}</p>
                  <p className="mt-1 text-sm text-gray-600">{t(`flow.${step}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20 scroll-mt-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900">{t('features.title')}</h2>
          <p className="mt-2 text-gray-500 max-w-xl mx-auto">{t('features.subtitle')}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.key} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all">
              <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-700 group-hover:bg-emerald-200 transition-colors">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{t(`features.${feature.key}`)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(`features.${feature.key}Desc`)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── PRICING (client component for toggle) ───────────────────── */}
      <PricingSection plans={plans} />

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900">{t('testimonials.title')}</h2>
          <p className="mt-2 text-gray-500">{t('testimonials.subtitle')}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <div key={testimonial.name} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="mb-6 text-sm text-gray-600 leading-relaxed italic">&ldquo;{testimonial.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${testimonial.color}`}>
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-xs text-gray-500">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">{t('faq.title')}</h2>
            <p className="mt-2 text-gray-500">{t('faq.subtitle')}</p>
          </div>
          <div className="space-y-4">
            {FAQ_KEYS.map((k) => (
              <details key={k} className="group rounded-2xl border border-gray-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between p-5 font-semibold text-gray-900 list-none">
                  {t(`faq.${k}`)}
                  <svg className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 pt-0 text-sm text-gray-500 leading-relaxed">
                  {t(`faq.${k.replace('q', 'a')}`)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 p-10 text-center text-white shadow-xl shadow-green-200">
          <h2 className="text-3xl font-bold">{t('cta.title')}</h2>
          <p className="mt-3 text-green-100 max-w-xl mx-auto">{t('cta.subtitle')}</p>
          <Link href="/register" className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 font-semibold text-green-600 hover:bg-green-50 transition-colors shadow-lg">
            {t('cta.action')}
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500 text-white font-bold text-xs">F</div>
              <span className="font-semibold text-gray-800">FadaaWhats</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/page/terms" className="hover:text-gray-800 transition-colors">{t('footer.terms')}</Link>
              <Link href="/page/privacy" className="hover:text-gray-800 transition-colors">{t('footer.privacy')}</Link>
              <Link href="/contact" className="hover:text-gray-800 transition-colors">{t('footer.contact')}</Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} FadaaWhats. {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  );
}
