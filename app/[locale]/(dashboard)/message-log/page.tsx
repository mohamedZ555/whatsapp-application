'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function MessageLogPage() {
  const t = useTranslations('messageLog');
  const tc = useTranslations('common');
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ isIncoming: '', status: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filter.isIncoming !== '') params.set('isIncoming', filter.isIncoming);
    if (filter.status) params.set('status', filter.status);
    fetch(`/api/message-log?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.data ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, filter]);

  const statusColor: Record<string, string> = {
    sent: 'bg-blue-50 text-blue-700',
    delivered: 'bg-green-50 text-green-700',
    read: 'bg-purple-50 text-purple-700',
    failed: 'bg-red-50 text-red-700',
    received: 'bg-gray-50 text-gray-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <span className="text-sm text-gray-500">{total} {tc('results')}</span>
      </div>

      <div className="flex gap-2 mb-4">
        <select value={filter.isIncoming} onChange={e => setFilter(f => ({...f, isIncoming: e.target.value}))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">{t('all')}</option>
          <option value="true">{t('incoming')}</option>
          <option value="false">{t('outgoing')}</option>
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({...f, status: e.target.value}))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">{tc('status')}: {t('all')}</option>
          {['sent','delivered','read','failed','received'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
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
            {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">{tc('loading')}</td></tr>}
            {!loading && logs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">{tc('noData')}</td></tr>}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{log.contact?.firstName} {log.contact?.lastName} <span className="text-gray-400">({log.contact?.waId})</span></td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.messageContent ?? `[${log.messageType}]`}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{log.messageType}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${log.isIncomingMessage ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                    {log.isIncomingMessage ? '↓ ' + t('incoming') : '↑ ' + t('outgoing')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[log.status] ?? 'bg-gray-100 text-gray-600'}`}>{log.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
