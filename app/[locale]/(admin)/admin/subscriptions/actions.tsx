'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PLANS } from '@/lib/constants';

const PLAN_OPTIONS = Object.values(PLANS).map((p) => ({ id: p.id, label: p.title }));
const STATUS_OPTIONS = ['active', 'expired', 'cancelled', 'pending'];

type Sub = {
  id: string;
  planId: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  vendor: { id: string; title: string | null; slug: string | null; uid: string };
};

type Props = { sub: Sub; onRefresh: () => void };

export function SubscriptionActions({ sub, onRefresh }: Props) {
  const [modal, setModal] = useState<'none' | 'edit'>('none');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [planId, setPlanId] = useState(sub.planId);
  const [status, setStatus] = useState(sub.status);
  const [startsAt, setStartsAt] = useState(sub.startsAt ? sub.startsAt.slice(0, 10) : '');
  const [endsAt, setEndsAt] = useState(sub.endsAt ? sub.endsAt.slice(0, 10) : '');

  useEffect(() => { setMounted(true); }, []);

  function openEdit() {
    setPlanId(sub.planId);
    setStatus(sub.status);
    setStartsAt(sub.startsAt ? sub.startsAt.slice(0, 10) : '');
    setEndsAt(sub.endsAt ? sub.endsAt.slice(0, 10) : '');
    setModal('edit');
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, planId, status, startsAt: startsAt || null, endsAt: endsAt || null }),
      });
      const data = await res.json();
      if (data.success) { setModal('none'); onRefresh(); }
      else alert(data.error ?? 'Error');
    } catch { alert('Error'); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this subscription? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions?id=${encodeURIComponent(sub.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error ?? 'Error');
    } catch { alert('Error'); }
    finally { setLoading(false); }
  }

  const modalContent = modal === 'edit' && mounted
    ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Edit Subscription</h2>
            <p className="text-sm text-gray-500 mb-4">{sub.vendor.title ?? sub.vendor.uid}</p>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={planId} onChange={(e) => setPlanId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {PLAN_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                  <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                  <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => setModal('none')}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className="flex gap-1.5">
        <button onClick={openEdit} disabled={loading}
          className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          Edit
        </button>
        <button onClick={handleDelete} disabled={loading}
          className="rounded bg-rose-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
          Delete
        </button>
      </div>
      {modalContent}
    </>
  );
}
