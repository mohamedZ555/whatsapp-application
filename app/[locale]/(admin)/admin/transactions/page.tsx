'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

const PAGE_LIMITS = [10, 25, 50, 100] as const;

type Transaction = {
  id: string;
  uid: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  planId: string | null;
  billingCycle: string | null;
  createdAt: string;
  vendor: { id: string; uid: string; title: string | null; slug: string | null };
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-rose-100 text-rose-600',
    refunded: 'bg-gray-100 text-gray-500',
  };
  return map[status] ?? 'bg-gray-100 text-gray-500';
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    subscription: 'bg-blue-100 text-blue-700',
    manual: 'bg-purple-100 text-purple-700',
    refund: 'bg-rose-100 text-rose-600',
    credit: 'bg-emerald-100 text-emerald-700',
    debit: 'bg-orange-100 text-orange-700',
  };
  return map[type] ?? 'bg-gray-100 text-gray-500';
}

function AddTransactionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [vendors, setVendors] = useState<Array<{ id: string; title: string | null; uid: string }>>([]);
  const [vendorId, setVendorId] = useState('');
  const [type, setType] = useState('manual');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState('completed');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/vendors?limit=100')
      .then((r) => r.json())
      .then((d) => {
        setVendors(d.vendors ?? []);
        if (d.vendors?.length) setVendorId(d.vendors[0].id);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, type, amount, currency, status, description }),
      });
      const data = await res.json();
      if (data.success) { onCreated(); onClose(); }
      else setError(data.error ?? tCommon('error'));
    } catch { setError(tCommon('error')); }
    finally { setLoading(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{tAdmin('addTransaction')}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('vendor')}</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.title ?? v.uid}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('type')}</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {['subscription', 'manual', 'refund', 'credit', 'debit'].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {['pending', 'completed', 'failed', 'refunded'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('amount')}</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('currency')}</label>
              <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" maxLength={3} placeholder="USD" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('description')}</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? tAdmin('creating') : tCommon('create')}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function EditModal({ tx, onClose, onSaved }: { tx: Transaction; onClose: () => void; onSaved: () => void }) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [status, setStatus] = useState(tx.status);
  const [description, setDescription] = useState(tx.description ?? '');
  const [amount, setAmount] = useState(String(tx.amount));
  const [currency, setCurrency] = useState(tx.currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tx.id, status, description, amount, currency }),
      });
      const data = await res.json();
      if (data.success) { onSaved(); onClose(); }
      else setError(data.error ?? tCommon('error'));
    } catch { setError(tCommon('error')); }
    finally { setLoading(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{tAdmin('transactions')} — {tCommon('edit')}</h2>
        <p className="text-sm text-gray-500 mb-4">{tx.vendor.title ?? tx.vendor.uid}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('status')}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {['pending', 'completed', 'failed', 'refunded'].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('amount')}</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('currency')}</label>
              <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" maxLength={3} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('description')}</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? tCommon('saving') : tCommon('save')}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function AdminTransactionsPage() {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [period, setPeriod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (period) params.set('period', period);
      else {
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
      }
      const res = await fetch(`/api/admin/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, limit, search, statusFilter, typeFilter, period, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm(tAdmin('deleteTransactionConfirm'))) return;
    try {
      const res = await fetch(`/api/admin/transactions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.error ?? tCommon('error'));
    } catch (err) { alert(tCommon('error') + ': ' + String(err)); }
  }

  function handlePeriod(p: string) {
    setPeriod(p === period ? '' : p);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function handleDateRange() {
    setPeriod('');
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  const totalAmount = transactions.reduce((sum, tx) => tx.status === 'completed' ? sum + tx.amount : sum, 0);

  const periodLabels: Record<string, string> = {
    week: tAdmin('thisWeek'),
    month: tAdmin('thisMonth'),
    year: tAdmin('thisYear'),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[40px] font-normal leading-none tracking-tight text-emerald-950">{tAdmin('transactions')}</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          {tAdmin('addTransaction')}
        </button>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{tAdmin('totalThisPage')}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">${totalAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tAdmin('completedOnly')}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{tAdmin('totalRecords')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{total}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{tCommon('page')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{page} / {totalPages}</p>
        </div>
      </div>

      <section className="rounded-md border border-emerald-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-emerald-100 px-4 py-4">
          {/* Row 1: basic filters + search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{tCommon('show')}</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
              >
                {PAGE_LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
              >
                <option value="">{tAdmin('allStatuses')}</option>
                {['pending', 'completed', 'failed', 'refunded'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
              >
                <option value="">{tAdmin('allTypes')}</option>
                {['subscription', 'manual', 'refund', 'credit', 'debit'].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{tAdmin('searchVendor')}:</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-[200px] rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
                placeholder={tAdmin('vendorTitle') + '...'}
              />
              <button type="submit"
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {tCommon('search')}
              </button>
              {search && (
                <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                  {tCommon('filter')}
                </button>
              )}
            </form>
          </div>

          {/* Row 2: date filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tAdmin('period')}:</span>
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriod(p)}
                className={`rounded px-3 py-1 text-xs font-semibold border transition-colors ${
                  period === p
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tAdmin('custom')}:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); handleDateRange(); }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
            />
            <span className="text-xs text-slate-400">{tAdmin('to')}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); handleDateRange(); }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
            />
            {(period || dateFrom || dateTo) && (
              <button
                onClick={() => { setPeriod(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="rounded px-2.5 py-1 text-xs font-semibold border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
              >
                {tAdmin('clearDates')}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto px-4 py-3">
          <table className="min-w-[900px] w-full border-collapse text-[13px] text-slate-600">
            <thead>
              <tr className="border-b border-emerald-100 bg-emerald-50/50 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('date')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('vendor')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('type')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('description')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('plan')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('amount')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tCommon('status')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">{tCommon('loading')}</td>
                </tr>
              )}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">{tAdmin('noTransactions')}</td>
                </tr>
              )}
              {!loading && transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-emerald-50 bg-white hover:bg-emerald-50/30">
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 font-medium text-emerald-800">{tx.vendor.title ?? tx.vendor.slug ?? tx.vendor.uid}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${typeBadge(tx.type)}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{tx.description ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {tx.planId ? `${tx.planId}${tx.billingCycle ? ` / ${tx.billingCycle}` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">
                    {tx.currency} {tx.amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadge(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditTx(tx)}
                        className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        {tCommon('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="rounded bg-rose-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-600"
                      >
                        {tCommon('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 px-4 py-3 text-sm text-slate-500">
          <div>{tAdmin('showing', { start, end, total })}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${page > 1 ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'}`}
            >
              {tCommon('previous')}
            </button>
            <span className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${page < totalPages ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'}`}
            >
              {tCommon('next')}
            </button>
          </div>
        </div>
      </section>

      {mounted && showAdd && (
        <AddTransactionModal onClose={() => setShowAdd(false)} onCreated={fetchData} />
      )}
      {mounted && editTx && (
        <EditModal tx={editTx} onClose={() => setEditTx(null)} onSaved={fetchData} />
      )}
    </div>
  );
}
