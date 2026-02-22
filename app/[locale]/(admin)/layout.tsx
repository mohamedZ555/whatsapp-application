import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Link } from '@/i18n/navigation';
import { redirect } from 'next/navigation';
import { USER_ROLES } from '@/lib/constants';
import LocaleSwitcher from '@/components/layout/locale-switcher';
import AdminSidebar from '@/components/layout/admin-sidebar';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const roleId = (session?.user as { roleId?: number } | undefined)?.roleId;
  if (!session?.user || roleId !== USER_ROLES.SUPER_ADMIN) redirect('/login');
  const locale = await getLocale();
  const tAdmin = await getTranslations('admin');
  const isRtl = locale === 'ar';

  return (
    <div className={`flex h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50/70 text-slate-700 ${isRtl ? 'flex-row-reverse' : ''}`}>
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-emerald-100 bg-white/90 px-6 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">{tAdmin('title')}</div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <span className="text-sm font-semibold text-slate-700">{session.user.name ?? tAdmin('superAdministrator')}</span>
            <Link
              href="/dashboard"
              className="rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              {tAdmin('loginAs')}
            </Link>
          </div>
        </header>
        <main className="admin-console-bg flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
