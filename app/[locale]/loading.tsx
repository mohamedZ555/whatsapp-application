'use client';

import { useTranslations } from 'next-intl';

export default function LocaleLoadingPage() {
  const tc = useTranslations('common');

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
          <div>
            <p className="text-base font-semibold text-emerald-900">{tc('loading')}</p>
            <p className="text-sm text-slate-500">{tc('loadingPageHint')}</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-3 w-11/12 rounded bg-emerald-50" />
          <div className="h-3 w-9/12 rounded bg-emerald-50" />
          <div className="h-3 w-10/12 rounded bg-emerald-50" />
        </div>
      </div>
    </div>
  );
}
