'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { PLANS } from '@/lib/constants';

const PLAN_OPTIONS = Object.values(PLANS).map((p) => ({ id: p.id, label: p.title }));
const PAGE_LIMITS = [10, 25, 50, 100] as const;

type Sub = {
  id: string;
  planId: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  vendor: { id: string; title: string | null; slug: string | null; uid: string };
};

function billingCycleLabel(sub: Sub, tAdmin: (k: string) => string) {
  if (!sub.startsAt || !sub.endsAt) return '—';
  const days = (new Date(sub.endsAt).getTime() - new Date(sub.startsAt).getTime()) / (1000 * 60 * 60 * 24);
  return days >= 300 ? tAdmin('yearly') : tAdmin('monthly');
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-rose-100 text-rose-600',
    pending: 'bg-amber-100 text-amber-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-500';
}

function planLabel(id: string) {
  return PLANS[id as keyof typeof PLANS]?.title ?? id;
}

function AddSubscriptionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [vendors, setVendors] = useState<Array<{ id: string; title: string | null; uid: string }>>([]);
  const [vendorId, setVendorId] = useState('');
  const [planId, setPlanId] = useState('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
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
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, planId, billingCycle }),
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{tAdmin('addSubscription')}</h2>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('plan')}</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {PLAN_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('billingCycle')}</label>
            <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="monthly">{tAdmin('monthly')}</option>
              <option value="yearly">{tAdmin('yearly')}</option>
            </select>
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

function EditModal({ sub, onClose, onSaved }: { sub: Sub; onClose: () => void; onSaved: () => void }) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [planId, setPlanId] = useState(sub.planId);
  const [status, setStatus] = useState(sub.status);
  const [startsAt, setStartsAt] = useState(sub.startsAt ? sub.startsAt.slice(0, 10) : '');
  const [endsAt, setEndsAt] = useState(sub.endsAt ? sub.endsAt.slice(0, 10) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, planId, status, startsAt: startsAt || null, endsAt: endsAt || null }),
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
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{tAdmin('subscriptions')} — {tCommon('edit')}</h2>
        <p className="text-sm text-gray-500 mb-4">{sub.vendor.title ?? sub.vendor.uid}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('plan')}</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {PLAN_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('status')}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {['active', 'expired', 'cancelled', 'pending'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('startsAt')}</label>
              <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('endsAt')}</label>
              <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
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

export default function AdminSubscriptionsPage() {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [subscriptions, setSubscriptions] = useState<Sub[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editSub, setEditSub] = useState<Sub | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      const data = await res.json();
      setSubscriptions(data.subscriptions ?? []);
      setTotal(data.total ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, limit, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm(tAdmin('deleteSubscriptionConfirm'))) return;
    try {
      const res = await fetch(`/api/admin/subscriptions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.error ?? tCommon('error'));
    } catch { alert(tCommon('error')); }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[40px] font-normal leading-none tracking-tight text-emerald-950">{tAdmin('subscriptions')}</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          {tAdmin('addSubscription')}
        </button>
      </div>

      <section className="rounded-md border border-emerald-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>{tCommon('show')}</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            >
              {PAGE_LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>{tCommon('results')}</span>
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

        {/* Table */}
        <div className="overflow-x-auto px-4 py-3">
          <table className="min-w-[860px] w-full border-collapse text-[13px] text-slate-600">
            <thead>
              <tr className="border-b border-emerald-100 bg-emerald-50/50 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('vendor')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('plan')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('billing')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tCommon('status')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('starts')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('ends')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">{tCommon('loading')}</td>
                </tr>
              )}
              {!loading && subscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">{tAdmin('noSubscriptions')}</td>
                </tr>
              )}
              {!loading && subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-emerald-50 bg-white hover:bg-emerald-50/30">
                  <td className="px-3 py-2 font-medium text-emerald-800">{sub.vendor.title ?? sub.vendor.slug ?? sub.vendor.uid}</td>
                  <td className="px-3 py-2">{planLabel(sub.planId)}</td>
                  <td className="px-3 py-2">{billingCycleLabel(sub, tAdmin)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadge(sub.status)}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2">{sub.endsAt ? new Date(sub.endsAt).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditSub(sub)}
                        className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        {tCommon('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
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

      {/* Modals */}
      {mounted && showAdd && (
        <AddSubscriptionModal onClose={() => setShowAdd(false)} onCreated={fetchData} />
      )}
      {mounted && editSub && (
        <EditModal sub={editSub} onClose={() => setEditSub(null)} onSaved={fetchData} />
      )}
    </div>
  );
}
