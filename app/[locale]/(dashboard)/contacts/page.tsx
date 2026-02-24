'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function ContactsPage() {
  const t = useTranslations('contacts');
  const tc = useTranslations('common');
  const [contacts, setContacts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [loading, setLoading] = useState(true);

  async function fetchContacts() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (assignedFilter) params.set('assigned', assignedFilter);
    if (sortBy) params.set('orderBy', sortBy);
    const res = await fetch(`/api/contacts?${params.toString()}`);
    const data = await res.json();
    setContacts(data.data ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, assignedFilter, sortBy]);

  async function deleteContact(id: string) {
    if (!confirm(tc('confirmDelete'))) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    fetchContacts();
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{total} {tc('results')}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/contacts/import" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            {t('importContacts')}
          </Link>
          <Link href="/contacts/new" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
            {t('addContact')}
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border border-gray-200 rounded-lg p-3 bg-white mb-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <input
          type="text"
          placeholder={t('search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[200px]"
        />

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All statuses</option>
          <option value="1">{tc('active')}</option>
          <option value="2">{tc('inactive')}</option>
        </select>

        {/* Assigned dropdown */}
        <select
          value={assignedFilter}
          onChange={(e) => { setAssignedFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All</option>
          <option value="me">Assigned to me</option>
          <option value="none">Unassigned</option>
        </select>

        {/* Sort by dropdown */}
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="created">Created</option>
          <option value="messaged">Last Messaged</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('firstName')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('phone')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{t('email')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{tc('status')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">{tc('loading')}</td></tr>
            )}
            {!loading && contacts.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">{tc('noData')}</td></tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-700 font-semibold">
                      {c.firstName?.[0]?.toUpperCase() ?? c.waId?.[0]}
                    </div>
                    <span className="font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.waId}</td>
                <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 1 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status === 1 ? tc('active') : tc('inactive')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/chat/${c.id}`} className="text-blue-600 hover:underline text-xs">{tc('view')}</Link>
                    <button onClick={() => deleteContact(c.id)} className="text-red-500 hover:underline text-xs">{tc('delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50"
          >
            {tc('previous')}
          </button>
          <span className="text-sm text-gray-600">
            {tc('page')} {page} {tc('of')} {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50"
          >
            {tc('next')}
          </button>
        </div>
      )}
    </div>
  );
}
