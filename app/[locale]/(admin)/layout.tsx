import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Link } from '@/i18n/navigation';
import { redirect } from 'next/navigation';
import { USER_ROLES } from '@/lib/constants';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).roleId !== USER_ROLES.SUPER_ADMIN) redirect('/login');

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100">
      <aside className="w-64 bg-slate-950 border-e border-slate-800 flex flex-col text-slate-100">
        <div className="h-16 flex items-center px-5 border-b border-slate-800">
          <span className="font-bold">FadaaWhats Admin</span>
        </div>
        <nav className="py-4 px-3 flex-1">
          <ul className="space-y-0.5">
            {[
              { href: '/admin', label: 'Dashboard' },
              { href: '/admin/vendors', label: 'Vendors' },
              { href: '/admin/subscriptions', label: 'Subscriptions' },
              { href: '/admin/configuration/general', label: 'Configuration' },
              { href: '/admin/pages', label: 'Pages' },
              { href: '/admin/translations', label: 'Translations' },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white/85 border-b border-slate-200 backdrop-blur flex items-center justify-end px-6">
          <Link href="/dashboard" className="text-sm text-emerald-700 hover:underline">Vendor Dashboard</Link>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
