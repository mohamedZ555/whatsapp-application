import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LocaleSwitcher from '@/components/layout/locale-switcher';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const roleId = (session.user as any).roleId;
    redirect(roleId === 1 ? '/admin' : '/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto flex max-w-6xl justify-end py-4">
        <LocaleSwitcher />
      </div>
      <div className="flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
