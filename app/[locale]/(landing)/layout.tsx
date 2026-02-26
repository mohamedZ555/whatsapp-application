import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import LocaleSwitcher from '@/components/layout/locale-switcher';

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('landing');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-20 border-b border-emerald-100/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 text-white font-bold text-sm">
              F
            </div>
            <span className="text-lg font-bold text-gray-900">FadaaWhats</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/#features" className="hidden sm:block text-sm text-gray-600 hover:text-green-600 font-medium">
              {t('nav.features')}
            </Link>
            <Link href="/#pricing" className="hidden sm:block text-sm text-gray-600 hover:text-green-600 font-medium">
              {t('nav.pricing')}
            </Link>
            <Link href="/contact" className="hidden sm:block text-sm text-gray-600 hover:text-green-600 font-medium">
              {t('nav.contact')}
            </Link>
            <LocaleSwitcher />
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200">
              {t('hero.login')}
            </Link>
            <Link href="/register" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600">
              {t('hero.getStarted')}
            </Link>
          </div>
        </div>
      </nav>

      <main>{children}</main>

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
