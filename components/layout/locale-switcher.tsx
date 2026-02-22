'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface LocaleSwitcherProps {
  className?: string;
}

export default function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className={cn('flex gap-1', className)}>
      {routing.locales.map((item) => (
        <button
          key={item}
          onClick={() => router.replace(pathname, { locale: item })}
          className={cn(
            'text-xs px-2.5 py-1 rounded border transition-colors uppercase',
            locale === item
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-gray-200 hover:bg-gray-50 text-gray-700',
          )}
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
