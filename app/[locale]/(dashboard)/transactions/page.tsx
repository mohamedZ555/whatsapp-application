'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';

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

export default function TransactionsPage() {
  const t = useTranslations('transactionsPage');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  const statusLabel = (status: string) => t(`status.${status}`);
  const typeLabel = (type: string) => t(`type.${type}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[40px] font-normal leading-none tracking-tight text-emerald-950">{t('title')}</h1>
      </div>

      <section className="rounded-md border border-emerald-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>{tc('show')}</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            >
              {PAGE_LIMITS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>{tc('results')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            >
              <option value="">{t('allStatuses')}</option>
              {['pending', 'completed', 'failed', 'refunded'].map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            >
              <option value="">{t('allTypes')}</option>
              {['subscription', 'manual', 'refund', 'credit', 'debit'].map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto px-4 py-3">
          <table className="min-w-[720px] w-full border-collapse text-[13px] text-slate-600">
            <thead>
              <tr className="border-b border-emerald-100 bg-emerald-50/50 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                <th className="px-3 py-2 text-start font-semibold">{t('columns.date')}</th>
                <th className="px-3 py-2 text-start font-semibold">{t('columns.type')}</th>
                <th className="px-3 py-2 text-start font-semibold">{t('columns.description')}</th>
                <th className="px-3 py-2 text-start font-semibold">{t('columns.plan')}</th>
                <th className="px-3 py-2 text-start font-semibold">{t('columns.amount')}</th>
                <th className="px-3 py-2 text-start font-semibold">{t('columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">{tc('loading')}</td>
                </tr>
              )}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">{t('empty')}</td>
                </tr>
              )}
              {!loading && transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-emerald-50 bg-white hover:bg-emerald-50/30">
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${typeBadge(tx.type)}`}>
                      {typeLabel(tx.type)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{tx.description ?? '-'}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {tx.planId ? (
                      <span>
                        {tx.planId}
                        {tx.billingCycle ? ` / ${tx.billingCycle}` : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800">
                    {tx.currency} {tx.amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadge(tx.status)}`}>
                      {statusLabel(tx.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 px-4 py-3 text-sm text-slate-500">
          <div>{t('showing', { start, end, total })}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${page > 1 ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'}`}
            >
              {tc('previous')}
            </button>
            <span className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${page < totalPages ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'}`}
            >
              {tc('next')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
