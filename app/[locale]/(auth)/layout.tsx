import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const roleId = session?.user?.roleId;
  if (typeof roleId === 'number') {
    redirect(roleId === 1 ? '/admin' : '/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
