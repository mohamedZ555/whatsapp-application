'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Template {
  id: string;
  templateName: string;
  templateStatus: string;
  category: string;
  languageCode: string;
  updatedAt: string;
  data?: any;
}

export default function TemplatesPage() {
  const t = useTranslations('templates');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const tr = (en: string, ar: string) => (isArabic ? ar : en);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchTemplates() {
    setLoading(true);
    const res = await fetch('/api/whatsapp/templates');
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function syncTemplates() {
    setSyncing(true);
    await fetch('/api/whatsapp/templates/sync', { method: 'POST' });
    await fetchTemplates();
    setSyncing(false);
  }

  async function deleteTemplate(id: string) {
    if (!confirm(tc('confirmDelete'))) return;
    setDeletingId(id);
    await fetch(`/api/whatsapp/templates/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    fetchTemplates();
  }

  useEffect(() => { fetchTemplates(); }, []);

  const filtered = templates.filter((tpl) =>
    tpl.templateName.toLowerCase().includes(search.toLowerCase()) ||
    tpl.category.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    APPROVED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    PAUSED: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  };

  function getBodyText(tpl: Template): string {
    const comps: any[] = tpl.data?.components ?? [];
    const body = comps.find((c: any) => c.type === 'BODY');
    return body?.text ?? '';
  }

  function getHeaderText(tpl: Template): string {
    const comps: any[] = tpl.data?.components ?? [];
    const header = comps.find((c: any) => c.type === 'HEADER');
    if (!header) return '';
    if (header.format === 'TEXT') return header.text ?? '';
    return `[${header.format}]`;
  }

  function getButtons(tpl: Template): any[] {
    const comps: any[] = tpl.data?.components ?? [];
    const btns = comps.find((c: any) => c.type === 'BUTTONS');
    return btns?.buttons ?? [];
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={syncTemplates}
            disabled={syncing}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? tc('loading') : t('syncTemplates')}
          </button>
          <Link
            href="/templates/create"
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('createTemplate')}
          </Link>
        </div>
      </div>

      {/* Search + Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{filtered.length} {tc('results')}</p>
        <input
          type="text"
          placeholder={tc('search') + '...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{t('templateName')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{t('language')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{t('category')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{tc('status')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{tc('updatedAt')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && [...Array(5)].map((_, i) => (
              <tr key={i}>
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                ))}
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">{tc('noData')}</td></tr>
            )}
            {filtered.map((tpl) => {
              const sc = statusConfig[tpl.templateStatus] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
              return (
                <tr key={tpl.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{tpl.templateName}</td>
                  <td className="px-4 py-3 text-gray-600">{tpl.languageCode}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{tpl.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {tpl.templateStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(tpl.updatedAt).toLocaleString(isArabic ? 'ar' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => setPreviewTemplate(tpl)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        {tc('view')}
                      </button>
                      <Link
                        href={`/templates/${tpl.id}/edit`}
                        className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
                      >
                        {tc('edit')}
                      </Link>
                      <button
                        onClick={() => deleteTemplate(tpl.id)}
                        disabled={deletingId === tpl.id}
                        className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium disabled:opacity-50"
                      >
                        {deletingId === tpl.id ? tr('...', '...') : tc('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{previewTemplate.templateName}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-[180px]">
                <div className="bg-white rounded-xl shadow-sm max-w-[90%] p-3 text-sm">
                  {getHeaderText(previewTemplate) && (
                    <div className="font-semibold text-gray-800 mb-2 pb-2 border-b text-xs uppercase tracking-wide">
                      {getHeaderText(previewTemplate)}
                    </div>
                  )}
                  <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                    {getBodyText(previewTemplate) || <span className="text-gray-400 italic">{tr('No body text', 'لا يوجد نص')}</span>}
                  </p>
                  {previewTemplate.data?.components?.find((c: any) => c.type === 'FOOTER') && (
                    <p className="text-xs text-gray-400 mt-2">
                      {previewTemplate.data.components.find((c: any) => c.type === 'FOOTER')?.text}
                    </p>
                  )}
                  {getButtons(previewTemplate).length > 0 && (
                    <div className="border-t mt-2 pt-2 space-y-1">
                      {getButtons(previewTemplate).map((btn: any, i: number) => (
                        <div key={i} className="text-center text-blue-500 text-xs font-medium py-1 border-t first:border-t-0">
                          {btn.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap text-xs">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">{previewTemplate.category}</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{previewTemplate.languageCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
