'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

type VendorActionsCellProps = {
  vendor: {
    id: string;
    title: string | null;
    slug: string | null;
    uid: string;
    status: number;
  };
  adminUserStatus: number | null;
  subscriptionPlanId?: string | null;
  onRefresh: () => void;
};

type ModalState = 'none' | 'edit' | 'password' | 'plan';

const AVAILABLE_PLANS = [
  { id: 'free', label: 'Free' },
  { id: 'plan_1', label: 'Standard' },
  { id: 'plan_2', label: 'Premium' },
  { id: 'plan_3', label: 'Ultimate' },
];

export function VendorActionsCell({ vendor, adminUserStatus, subscriptionPlanId, onRefresh }: VendorActionsCellProps) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');

  const [modal, setModal] = useState<ModalState>('none');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(vendor.title ?? '');
  const [editStatus, setEditStatus] = useState(vendor.status);

  // Password form state
  const [newPassword, setNewPassword] = useState('');

  // Plan form state
  const [selectedPlan, setSelectedPlan] = useState(subscriptionPlanId ?? 'free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => { setMounted(true); }, []);

  // Determine vendor state
  const isActive = vendor.status === 1;
  const isPending = vendor.status === 2 || (adminUserStatus !== null && adminUserStatus === 4);
  const isBanned = vendor.status === 3 || (adminUserStatus !== null && adminUserStatus === 6);

  async function doAction(action: 'approve' | 'ban' | 'unban') {
    const confirmMsg = action === 'approve'
      ? 'Approve this vendor? They will be able to login.'
      : action === 'ban'
      ? 'Ban this vendor? All their users will be blocked.'
      : 'Unban this vendor? They will be restored to active.';
    if (!window.confirm(confirmMsg)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: vendor.id, action }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error ?? tCommon('error'));
    } catch { alert(tCommon('error')); }
    finally { setLoading(false); }
  }

  async function handleLoginAs() {
    if (!window.confirm(tAdmin('confirmLoginAs'))) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: vendor.id }),
      });
      const data = await res.json();
      if (data.success) window.location.href = '/dashboard';
      else alert(data.error ?? tCommon('error'));
    } catch { alert(tCommon('error')); }
    finally { setLoading(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: vendor.id, title: editTitle, status: editStatus }),
      });
      const data = await res.json();
      if (data.success) { setModal('none'); onRefresh(); }
      else alert(data.error ?? tCommon('error'));
    } catch { alert(tCommon('error')); }
    finally { setLoading(false); }
  }

  async function handleSoftDelete() {
    if (!window.confirm(tAdmin('confirmSoftDelete'))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors?id=${encodeURIComponent(vendor.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error ?? tCommon('error'));
    } catch { alert(tCommon('error')); }
    finally { setLoading(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { alert(tAdmin('passwordTooShort')); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vendors/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: vendor.id, password: newPassword }),
      });
      const data = await res.json();
      if (data.success) { setNewPassword(''); setModal('none'); alert(tAdmin('passwordChanged')); }
      else alert(data.error ?? tCommon('error'));
    } catch { alert(tCommon('error')); }
    finally { setLoading(false); }
  }

  async function handleChangePlan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: vendor.id, planId: selectedPlan, billingCycle }),
      });
      const data = await res.json();
      if (data.success) { setModal('none'); onRefresh(); }
      else alert(data.error ?? tCommon('error'));
    } catch { alert(tCommon('error')); }
    finally { setLoading(false); }
  }

  const modalContent = modal !== 'none' && mounted ? createPortal(
    <>
      {modal === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{tCommon('edit')} — {vendor.title ?? vendor.uid}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('vendorTitle')}</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('status')}</label>
                <select value={editStatus} onChange={(e) => setEditStatus(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value={1}>Active</option>
                  <option value={2}>Pending</option>
                  <option value={3}>Banned</option>
                  <option value={0}>Deleted</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
                  {loading ? tCommon('saving') : tCommon('save')}
                </button>
                <button type="button" onClick={() => setModal('none')}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  {tCommon('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{tAdmin('changePassword')} — {vendor.title ?? vendor.uid}</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('newPassword')}</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  minLength={6} required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
                  {loading ? tCommon('saving') : tAdmin('changePassword')}
                </button>
                <button type="button" onClick={() => { setModal('none'); setNewPassword(''); }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  {tCommon('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'plan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{tAdmin('changePlan')} — {vendor.title ?? vendor.uid}</h2>
            <form onSubmit={handleChangePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('plan')}</label>
                <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {AVAILABLE_PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
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
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
                  {loading ? tCommon('saving') : tAdmin('applyPlan')}
                </button>
                <button type="button" onClick={() => setModal('none')}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  {tCommon('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>,
    document.body
  ) : null;

  return (
    <>
      {/* Quick Actions column */}
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {/* Approve button — only for pending */}
          {isPending && (
            <button onClick={() => doAction('approve')} disabled={loading}
              className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
              Approve
            </button>
          )}
          {/* Unban button — only for banned */}
          {isBanned && !isPending && (
            <button onClick={() => doAction('unban')} disabled={loading}
              className="rounded bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              Unban
            </button>
          )}
          {/* Login As — only for active vendors */}
          {isActive && (
            <button onClick={handleLoginAs} disabled={loading}
              className="rounded bg-slate-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600 disabled:opacity-50">
              {tAdmin('loginAs')}
            </button>
          )}
          {/* Change Plan */}
          <button onClick={() => { setSelectedPlan(subscriptionPlanId ?? 'free'); setModal('plan'); }}
            className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">
            {subscriptionPlanId ?? tAdmin('subscriptions')}
          </button>
        </div>
      </td>

      {/* Actions column */}
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => { setEditTitle(vendor.title ?? ''); setEditStatus(vendor.status); setModal('edit'); }}
            className="rounded bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800">
            {tCommon('edit')}
          </button>
          {/* Ban button — only for active vendors */}
          {isActive && (
            <button onClick={() => doAction('ban')} disabled={loading}
              className="rounded bg-rose-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
              Ban
            </button>
          )}
          <button onClick={handleSoftDelete} disabled={loading}
            className="rounded bg-rose-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
            {tAdmin('softDelete')}
          </button>
          <button onClick={() => { setNewPassword(''); setModal('password'); }}
            className="rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800">
            {tAdmin('changePassword')}
          </button>
        </div>
      </td>

      {modalContent}
    </>
  );
}
