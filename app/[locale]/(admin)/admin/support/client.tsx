'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type Reply = { id: string; content: string; isAdmin: boolean; createdAt: Date };
type Vendor = { id: string; title: string | null; uid: string };
type Ticket = {
  id: string;
  uid: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  vendor: Vendor;
  replies: Reply[];
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function AdminSupportClient({
  tickets: initialTickets,
  total,
  page,
  limit,
  statusFilter,
}: {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
  statusFilter: string;
}) {
  const tCommon = useTranslations('common');
  const [tickets, setTickets] = useState(initialTickets);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const STATUSES = ['', 'open', 'in_progress', 'resolved', 'closed'];

  const handleSendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      });
      const data = await res.json();
      const updatedSelected = {
        ...selected,
        replies: [...selected.replies, data.reply],
        status: 'in_progress',
      };
      setSelected(updatedSelected);
      setTickets((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, status: 'in_progress' } : t))
      );
      setReply('');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return;
    setChangingStatus(true);
    try {
      await fetch(`/api/support/tickets/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setSelected({ ...selected, status: newStatus });
      setTickets((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, status: newStatus } : t))
      );
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[40px] font-normal leading-none tracking-tight text-emerald-950">
          Support Tickets
        </h1>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
          {total} ticket{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s || 'all'}
            href={`/admin/support?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === s
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50'
            }`}
          >
            {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Ticket list */}
        <div className="lg:col-span-2 space-y-2">
          {tickets.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-slate-400">
              No tickets found.
            </div>
          )}
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelected(ticket)}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                selected?.id === ticket.id
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-gray-100 bg-white hover:border-emerald-200'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold text-gray-900">{ticket.subject}</p>
                <span
                  className={`flex-shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
                    STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500">{ticket.vendor.title ?? ticket.vendor.uid}</p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    PRIORITY_COLORS[ticket.priority] ?? ''
                  }`}
                >
                  {ticket.priority}
                </span>
                <p className="text-[11px] text-gray-400">
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href={`/admin/support?status=${statusFilter}&page=${Math.max(1, page - 1)}`}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                hasPrev
                  ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              }`}
              aria-disabled={!hasPrev}
            >
              {tCommon('previous')}
            </Link>
            <span className="text-xs text-gray-500">
              Page {page} / {totalPages}
            </span>
            <Link
              href={`/admin/support?status=${statusFilter}&page=${Math.min(totalPages, page + 1)}`}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                hasNext
                  ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              }`}
              aria-disabled={!hasNext}
            >
              {tCommon('next')}
            </Link>
          </div>
        </div>

        {/* Ticket detail */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
              Select a ticket to view
            </div>
          ) : (
            <div
              className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm"
              style={{ maxHeight: '76vh' }}
            >
              {/* Header */}
              <div className="border-b border-gray-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-900">{selected.subject}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {selected.vendor.title ?? selected.vendor.uid} &middot; #
                      {selected.uid.slice(0, 8)} &middot; Priority:{' '}
                      <span className="capitalize">{selected.priority}</span>
                    </p>
                  </div>
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={changingStatus}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 outline-none focus:border-emerald-400"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {selected.replies.map((r) => (
                  <div key={r.id} className={`flex ${r.isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        r.isAdmin ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {r.isAdmin && (
                        <p className="mb-1 text-xs font-semibold text-emerald-200">Admin</p>
                      )}
                      <p className="whitespace-pre-wrap">{r.content}</p>
                      <p
                        className={`mt-1.5 text-[11px] ${
                          r.isAdmin ? 'text-emerald-200' : 'text-gray-400'
                        }`}
                      >
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              {selected.status !== 'closed' ? (
                <div className="border-t border-gray-100 px-5 py-4">
                  <textarea
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !reply.trim()}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 px-5 py-3 text-center text-xs text-gray-400">
                  This ticket is closed.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
