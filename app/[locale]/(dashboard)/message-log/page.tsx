'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

export default function MessageLogPage() {
  const t = useTranslations('messageLog');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [directionInput, setDirectionInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');

  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (direction !== '') params.set('isIncoming', direction);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    fetch(`/api/message-log?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.data ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, direction, status, search, startDate, endDate]);

  function handleApply() {
    setDirection(directionInput);
    setStatus(statusInput);
    setSearch(searchInput);
    setStartDate(startDateInput);
    setEndDate(endDateInput);
    setPage(1);
  }

  function handleClear() {
    setDirectionInput('');
    setStatusInput('');
    setSearchInput('');
    setStartDateInput('');
    setEndDateInput('');
    setDirection('');
    setStatus('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }

  const statusColor: Record<string, string> = {
    sent: 'bg-blue-50 text-blue-700',
    delivered: 'bg-green-50 text-green-700',
    read: 'bg-purple-50 text-purple-700',
    failed: 'bg-red-50 text-red-700',
    received: 'bg-gray-50 text-gray-700',
  };

  function getPageNumbers(): number[] {
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i);
    }
    return range;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <span className="text-sm text-gray-500">{total} {tc('results')}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('direction')}</label>
            <select
              value={directionInput}
              onChange={(e) => setDirectionInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">{t('all')}</option>
              <option value="true">{t('incoming')}</option>
              <option value="false">{t('outgoing')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{tc('status')}</label>
            <select
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">{t('all')}</option>
              {['sent', 'delivered', 'read', 'failed', 'received'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('contactNamePhone')}</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('searchContact')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('startDate')}</label>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('endDate')}</label>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              {t('apply')}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t('clear')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('contact')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('message')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('type')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('direction')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{tc('status')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('timestamp')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">{tc('loading')}</td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">{tc('noData')}</td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">
                  {log.contact?.firstName} {log.contact?.lastName}{' '}
                  <span className="text-gray-400">({log.contact?.waId})</span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {log.messageContent ?? `[${log.messageType}]`}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{log.messageType}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    log.isIncomingMessage ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {log.isIncomingMessage ? `? ${t('incoming')}` : `? ${t('outgoing')}`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[log.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(log.createdAt).toLocaleString(isArabic ? 'ar' : undefined)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            {tc('previous')}
          </button>

          {getPageNumbers()[0] > 1 && (
            <>
              <button
                onClick={() => setPage(1)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                1
              </button>
              {getPageNumbers()[0] > 2 && (
                <span className="px-2 py-1.5 text-gray-400 text-sm">...</span>
              )}
            </>
          )}

          {getPageNumbers().map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`px-3 py-1.5 border rounded text-sm ${
                n === page
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          ))}

          {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
            <>
              {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                <span className="px-2 py-1.5 text-gray-400 text-sm">...</span>
              )}
              <button
                onClick={() => setPage(totalPages)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            {tc('next')}
          </button>
        </div>
      )}
    </div>
  );
}
