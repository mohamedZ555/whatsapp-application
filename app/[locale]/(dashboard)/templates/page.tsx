'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function TemplatesPage() {
  const t = useTranslations('templates');
  const tc = useTranslations('common');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function fetchTemplates() {
    setLoading(true);
    const res = await fetch('/api/whatsapp/templates');
    const data = await res.json();
    setTemplates(data);
    setLoading(false);
  }

  async function syncTemplates() {
    setSyncing(true);
    await fetch('/api/whatsapp/templates/sync', { method: 'POST' });
    await fetchTemplates();
    setSyncing(false);
  }

  useEffect(() => { fetchTemplates(); }, []);

  const statusColor: Record<string, string> = {
    APPROVED: 'bg-green-50 text-green-700',
    PENDING: 'bg-yellow-50 text-yellow-700',
    REJECTED: 'bg-red-50 text-red-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <div className="flex gap-2">
          <button onClick={syncTemplates} disabled={syncing} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60">
            {syncing ? tc('loading') : t('syncTemplates')}
          </button>
          <Link href="/templates/create" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
            {t('createTemplate')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && [...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 animate-pulse border border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
        {!loading && templates.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">{tc('noData')}</div>
        )}
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{tpl.templateName}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ms-2 ${statusColor[tpl.templateStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                {t(tpl.templateStatus?.toLowerCase() as any) ?? tpl.templateStatus}
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-0.5 rounded">{tpl.category}</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded">{tpl.languageCode}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
