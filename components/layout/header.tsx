'use client';

import { signOut, useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { getInitials } from '@/lib/utils';
import LocaleSwitcher from '@/components/layout/locale-switcher';
import { USER_ROLES } from '@/lib/constants';
import { Link } from '@/i18n/navigation';

export default function Header() {
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const roleId = (session?.user as any)?.roleId as number | undefined;
  const isSuperAdmin = roleId === USER_ROLES.SUPER_ADMIN;

  const name = session?.user?.name ?? '';
  const initials = name ? getInitials(name.split(' ')[0], name.split(' ')[1]) : 'U';

  return (
    <header className="h-16 bg-white/90 backdrop-blur border-b border-emerald-100 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="rounded-lg mx-3 border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {tNav('adminPanel')}
          </Link>
        )}
        {/* Language switcher */}
        <LocaleSwitcher />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 hover:bg-emerald-50 rounded-lg px-3 py-2 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
            <span className="text-sm font-medium text-gray-700">{name}</span>
          </button>

          {open && (
            <div className="absolute end-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg w-40 py-1 z-50">
              <button
                onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
                className="w-full text-start px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                {tNav('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
