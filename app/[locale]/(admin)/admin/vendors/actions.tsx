'use client';

import { useState, useEffect, useCallback } from 'react';
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
  subscriptionPlanTitle?: string;
  planDisabledPerms?: string[];
  vendorStats?: {
    totalUsers: number;
    totalEmployees: number;
    totalContacts: number;
  };
  onRefresh: () => void;
};

type ModalState = 'none' | 'edit' | 'password' | 'plan' | 'details' | 'employees' | 'adminPerms';

const AVAILABLE_PLANS = [
  { id: 'free', label: 'Free' },
  { id: 'plan_1', label: 'Standard' },
  { id: 'plan_2', label: 'Premium' },
  { id: 'plan_3', label: 'Ultimate' },
];

const ALL_PERMISSIONS: { key: string; label: string; desc: string }[] = [
  { key: 'manage_contacts',  label: 'Manage Contacts',  desc: 'Create, edit, delete contacts' },
  { key: 'manage_campaigns', label: 'Manage Campaigns', desc: 'Create and send campaigns' },
  { key: 'manage_templates', label: 'Manage Templates', desc: 'Create and edit message templates' },
  { key: 'manage_bot_replies', label: 'Manage Bot Replies', desc: 'Configure automated bot replies' },
  { key: 'manage_chat',     label: 'Manage Chat',     desc: 'Access and reply to live chats' },
  { key: 'view_message_log', label: 'View Message Log', desc: 'Read message history and logs' },
  { key: 'manage_users',    label: 'Manage Users',    desc: 'Invite and manage team members' },
];

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  status: number;
  mobileNumber: string | null;
  roleId?: number;
  vendorUserDetail: { jobCategoryId: string | null; permissions: string[] | null } | null;
};

type VendorDetail = {
  id: string;
  title: string | null;
  uid: string;
  slug: string | null;
  status: number;
  createdAt: string;
  stripeCustomerId: string | null;
  trialEndsAt: string | null;
  subscription: { planId: string; status: string; endsAt: string | null } | null;
  _count: { contacts: number; campaigns: number; botReplies: number; botFlows: number };
};

function userStatusLabel(s: number) {
  const map: Record<number, string> = { 1: 'Active', 2: 'Inactive', 3: 'Suspended', 4: 'Pending', 5: 'Deleted', 6: 'Blocked' };
  return map[s] ?? 'Unknown';
}
function userStatusColor(s: number) {
  if (s === 1) return 'bg-emerald-100 text-emerald-700';
  if (s === 6 || s === 3 || s === 5) return 'bg-rose-100 text-rose-600';
  return 'bg-amber-100 text-amber-700';
}

export function VendorActionsCell({
  vendor,
  adminUserStatus,
  subscriptionPlanId,
  subscriptionPlanTitle,
  planDisabledPerms = [],
  vendorStats,
  onRefresh,
}: VendorActionsCellProps) {
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

  // Details / Employees state
  const [vendorDetail, setVendorDetail] = useState<VendorDetail | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [empLoading, setEmpLoading] = useState(false);

  // Permissions editor state
  const [permTarget, setPermTarget] = useState<Employee | null>(null);
  const [permChecked, setPermChecked] = useState<string[]>([]);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState('');

  // Admin user state (for admin permissions)
  const [adminUser, setAdminUser] = useState<Employee | null>(null);
  const [adminPermsChecked, setAdminPermsChecked] = useState<string[]>([]);
  const [adminPermSaving, setAdminPermSaving] = useState(false);
  const [adminPermError, setAdminPermError] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const isActive = vendor.status === 1;
  const isPending = vendor.status === 2 || (adminUserStatus !== null && adminUserStatus === 4);
  const isBanned = vendor.status === 3 || (adminUserStatus !== null && adminUserStatus === 6);

  const planDisplayTitle = subscriptionPlanTitle ?? subscriptionPlanId ?? 'Free';

  async function doAction(action: 'approve' | 'ban' | 'unban') {
    const confirmMsg =
      action === 'approve' ? tAdmin('confirmApprove') :
      action === 'ban' ? tAdmin('confirmBan') :
      tAdmin('confirmUnban');
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

  const openDetails = useCallback(async () => {
    setModal('details');
    if (vendorDetail) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendor.id}`);
      const data = await res.json();
      if (data.vendor) setVendorDetail(data.vendor);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  }, [vendor.id, vendorDetail]);

  const openEmployees = useCallback(async () => {
    setModal('employees');
    setEmpLoading(true);
    try {
      const res = await fetch(`/api/users?vendorId=${vendor.id}&roleId=3`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch { setEmployees([]); }
    finally { setEmpLoading(false); }
  }, [vendor.id]);

  const openAdminPerms = useCallback(async () => {
    setModal('adminPerms');
    setAdminPermError('');
    setAdminPermSaving(false);
    try {
      const res = await fetch(`/api/users?vendorId=${vendor.id}&roleId=2`);
      const data = await res.json();
      const admin: Employee | undefined = Array.isArray(data) ? data[0] : undefined;
      if (admin) {
        setAdminUser(admin);
        setAdminPermsChecked((admin.vendorUserDetail?.permissions as string[]) ?? []);
      } else {
        setAdminUser(null);
        setAdminPermsChecked([]);
      }
    } catch { setAdminUser(null); }
  }, [vendor.id]);

  function openEmpPerms(emp: Employee) {
    setPermTarget(emp);
    setPermChecked((emp.vendorUserDetail?.permissions as string[]) ?? []);
    setPermError('');
    setPermSaving(false);
  }

  function togglePerm(key: string, checked: string[], set: (v: string[]) => void) {
    set(checked.includes(key) ? checked.filter((k) => k !== key) : [...checked, key]);
  }

  async function saveEmpPerms() {
    if (!permTarget) return;
    setPermSaving(true);
    setPermError('');
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: permTarget.id, permissions: permChecked }),
      });
      const data = await res.json();
      if (data.success) {
        setEmployees((prev) => prev.map((e) => e.id === permTarget.id
          ? { ...e, vendorUserDetail: { ...e.vendorUserDetail, permissions: permChecked, jobCategoryId: e.vendorUserDetail?.jobCategoryId ?? null } }
          : e
        ));
        setPermTarget(null);
      } else {
        setPermError(data.error ?? 'Failed to save');
      }
    } catch { setPermError('Network error'); }
    finally { setPermSaving(false); }
  }

  async function saveAdminPerms() {
    if (!adminUser) return;
    setAdminPermSaving(true);
    setAdminPermError('');
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminUser.id, permissions: adminPermsChecked }),
      });
      const data = await res.json();
      if (data.success) {
        setModal('none');
      } else {
        setAdminPermError(data.error ?? 'Failed to save');
      }
    } catch { setAdminPermError('Network error'); }
    finally { setAdminPermSaving(false); }
  }

  const modalContent = modal !== 'none' && mounted ? createPortal(
    <>
      {/* ── EDIT ── */}
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

      {/* ── CHANGE PASSWORD ── */}
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

      {/* ── CHANGE PLAN ── */}
      {modal === 'plan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{tAdmin('changePlan')}</h2>
            <p className="text-sm text-slate-500 mb-4">{vendor.title ?? vendor.uid}</p>
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

      {/* ── VENDOR DETAILS ── */}
      {modal === 'details' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal('none')}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Vendor Details</h2>
              <button onClick={() => setModal('none')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {detailLoading ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
            ) : (
              <div className="space-y-4">
                {/* Identity */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm">
                  <Row label="Title" value={vendorDetail?.title ?? vendor.title ?? '—'} />
                  <Row label="UID" value={vendorDetail?.uid ?? vendor.uid} mono />
                  <Row label="Slug" value={vendorDetail?.slug ?? vendor.slug ?? '—'} />
                  <Row label="Status" value={<VendorStatusBadge status={vendor.status} />} />
                  <Row label="Created" value={vendorDetail?.createdAt ? new Date(vendorDetail.createdAt).toLocaleString() : '—'} />
                  {vendorDetail?.trialEndsAt && (
                    <Row label="Trial Ends" value={new Date(vendorDetail.trialEndsAt).toLocaleDateString()} />
                  )}
                  {vendorDetail?.stripeCustomerId && (
                    <Row label="Stripe ID" value={vendorDetail.stripeCustomerId} mono />
                  )}
                </div>

                {/* Subscription */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">Subscription</p>
                  <Row label="Plan" value={
                    <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700">
                      {planDisplayTitle}
                    </span>
                  } />
                  <Row label="Sub Status" value={vendorDetail?.subscription?.status ?? '—'} />
                  <Row label="Renews" value={vendorDetail?.subscription?.endsAt ? new Date(vendorDetail.subscription.endsAt).toLocaleDateString() : '—'} />
                </div>

                {/* Usage stats */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Contacts" value={vendorDetail?._count.contacts ?? vendorStats?.totalContacts ?? 0} color="text-blue-600" />
                  <StatCard label="Employees" value={vendorStats?.totalEmployees ?? 0} color="text-purple-600" />
                  <StatCard label="Campaigns" value={vendorDetail?._count.campaigns ?? 0} color="text-amber-600" />
                  <StatCard label="Bot Flows" value={vendorDetail?._count.botFlows ?? 0} color="text-emerald-600" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EMPLOYEES ── */}
      {modal === 'employees' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!permTarget) setModal('none'); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Employees</h2>
                <p className="text-sm text-slate-500">{vendor.title ?? vendor.uid}</p>
              </div>
              <button onClick={() => setModal('none')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {empLoading ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
              ) : employees.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No employees found.</div>
              ) : (
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2 text-start font-semibold">Name</th>
                      <th className="px-3 py-2 text-start font-semibold">Email</th>
                      <th className="px-3 py-2 text-start font-semibold">Phone</th>
                      <th className="px-3 py-2 text-start font-semibold">Username</th>
                      <th className="px-3 py-2 text-start font-semibold">Permissions</th>
                      <th className="px-3 py-2 text-start font-semibold">Status</th>
                      <th className="px-3 py-2 text-start font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const empPerms = (emp.vendorUserDetail?.permissions as string[]) ?? [];
                      return (
                        <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                            {emp.firstName} {emp.lastName}
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{emp.email}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{emp.mobileNumber ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{emp.username}</td>
                          <td className="px-3 py-2">
                            {empPerms.length === 0 ? (
                              <span className="text-[11px] text-slate-300">None</span>
                            ) : (
                              <div className="flex flex-wrap gap-0.5 max-w-[160px]">
                                {empPerms.slice(0, 3).map((p) => (
                                  <span key={p} className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700">
                                    {p.replace('manage_', '').replace('view_', '')}
                                  </span>
                                ))}
                                {empPerms.length > 3 && (
                                  <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500">+{empPerms.length - 3}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${userStatusColor(emp.status)}`}>
                              {userStatusLabel(emp.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => openEmpPerms(emp)}
                              className="rounded bg-purple-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-purple-700"
                            >
                              Edit Perms
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── inline permissions editor for an employee ── */}
          {permTarget && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={() => setPermTarget(null)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-900 mb-0.5">Edit Permissions</h3>
                <p className="text-sm text-slate-500 mb-4">{permTarget.firstName} {permTarget.lastName}</p>
                <div className="space-y-2 mb-4">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isPlanLocked = planDisabledPerms.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-3 group ${isPlanLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={!isPlanLocked && permChecked.includes(perm.key)}
                          onChange={() => !isPlanLocked && togglePerm(perm.key, permChecked, setPermChecked)}
                          disabled={isPlanLocked}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-800 group-hover:text-purple-700">
                            {perm.label}
                            {isPlanLocked && <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 rounded px-1 py-0.5">Plan locked</span>}
                          </p>
                          <p className="text-xs text-slate-400">{perm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {permError && <p className="text-xs text-red-600 mb-3 bg-red-50 border border-red-200 rounded px-2 py-1.5">{permError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={saveEmpPerms}
                    disabled={permSaving}
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {permSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setPermTarget(null)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADMIN PERMISSIONS ── */}
      {modal === 'adminPerms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal('none')}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-0.5">Admin Permissions</h2>
            <p className="text-sm text-slate-500 mb-4">{vendor.title ?? vendor.uid}</p>
            {planDisabledPerms.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                ⚠ Some permissions are locked by the vendor&apos;s current subscription plan and cannot be granted.
              </p>
            )}
            {!adminUser ? (
              <div className="py-6 text-center text-sm text-slate-400">No admin user found.</div>
            ) : (
              <>
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-4">
                  Admin: <span className="font-semibold text-slate-700">{adminUser.firstName} {adminUser.lastName}</span> · {adminUser.email}
                </p>
                <div className="space-y-2 mb-4">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isPlanLocked = planDisabledPerms.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-3 group ${isPlanLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={!isPlanLocked && adminPermsChecked.includes(perm.key)}
                          onChange={() => !isPlanLocked && togglePerm(perm.key, adminPermsChecked, setAdminPermsChecked)}
                          disabled={isPlanLocked}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-800 group-hover:text-emerald-700">
                            {perm.label}
                            {isPlanLocked && <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 rounded px-1 py-0.5">Plan locked</span>}
                          </p>
                          <p className="text-xs text-slate-400">{perm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {adminPermError && <p className="text-xs text-red-600 mb-3 bg-red-50 border border-red-200 rounded px-2 py-1.5">{adminPermError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={saveAdminPerms}
                    disabled={adminPermSaving}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {adminPermSaving ? 'Saving...' : 'Save Permissions'}
                  </button>
                  <button onClick={() => setModal('none')} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </>
            )}
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
          {isPending && (
            <button onClick={() => doAction('approve')} disabled={loading}
              className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
              Approve
            </button>
          )}
          {isBanned && !isPending && (
            <button onClick={() => doAction('unban')} disabled={loading}
              className="rounded bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              Unban
            </button>
          )}
          {isActive && (
            <button onClick={handleLoginAs} disabled={loading}
              className="rounded bg-slate-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600 disabled:opacity-50">
              {tAdmin('loginAs')}
            </button>
          )}
          {/* Change Plan — shows real plan title */}
          <button
            onClick={() => { setSelectedPlan(subscriptionPlanId ?? 'free'); setModal('plan'); }}
            className="rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
          >
            {planDisplayTitle}
          </button>
        </div>
      </td>

      {/* Actions column */}
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {/* Details */}
          <button onClick={openDetails}
            className="rounded bg-indigo-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-600">
            Details
          </button>
          {/* Employees */}
          <button onClick={openEmployees}
            className="rounded bg-purple-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-purple-600">
            Employees
          </button>
          {/* Admin Permissions */}
          <button onClick={openAdminPerms}
            className="rounded bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700">
            Admin Perms
          </button>
          <button onClick={() => { setEditTitle(vendor.title ?? ''); setEditStatus(vendor.status); setModal('edit'); }}
            className="rounded bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800">
            {tCommon('edit')}
          </button>
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

// ── small helper sub-components ──────────────────────────────
function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-semibold text-slate-500 shrink-0 w-24">{label}</span>
      <span className={`text-xs text-slate-800 text-end ${mono ? 'font-mono text-[11px] break-all' : ''}`}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function VendorStatusBadge({ status }: { status: number }) {
  if (status === 1) return <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700">Active</span>;
  if (status === 2) return <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700">Pending</span>;
  if (status === 3) return <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-600">Banned</span>;
  return <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-500">Deleted</span>;
}
