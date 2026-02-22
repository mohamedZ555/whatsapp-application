import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { USER_ROLES } from '@/lib/constants';
import { getLocale } from 'next-intl/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const locale = await getLocale();
  const isRtl = locale === 'ar';

  const roleId = (session.user as any).roleId;
  if (roleId !== USER_ROLES.SUPER_ADMIN && roleId !== USER_ROLES.VENDOR && roleId !== USER_ROLES.VENDOR_USER) redirect('/login');

  return (
    <div className={`flex h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50/70 ${isRtl ? 'flex-row-reverse' : ''}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
