'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { USER_ROLES, VENDOR_PERMISSIONS } from '@/lib/constants';

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber?: string | null;
  vendorId?: string | null;
  roleId: number;
  status: number;
  vendor?: { id: string; title: string | null; uid: string };
  vendorUserDetail?: { permissions: string[] | null } | null;
};

type VendorOption = {
  id: string;
  title: string | null;
  uid: string;
};

type UserFormState = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber: string;
  password: string;
  roleId: number;
  vendorId: string;
  vendorTitle: string;
  permissions: string[];
};

type UserEditState = {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber: string;
  roleId: number;
  status: number;
  vendorId: string;
  permissions: string[];
  password: string;
};

type ExtendedSessionUser = {
  id: string;
  roleId?: number;
  vendorId?: string | null;
};

const PERMISSION_LABELS: Record<string, string> = {
  manage_contacts: 'Contacts',
  manage_campaigns: 'Campaigns',
  manage_templates: 'Templates',
  manage_bot_replies: 'Bot Replies',
  manage_chat: 'Chat',
  view_message_log: 'Message Log',
  manage_users: 'Users',
};

const STATUS_MAP: Record<number, { label: string; cls: string }> = {
  1: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Inactive', cls: 'bg-slate-100 text-slate-500' },
  3: { label: 'Suspended', cls: 'bg-orange-100 text-orange-600' },
  4: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  5: { label: 'Deleted', cls: 'bg-slate-100 text-slate-400 line-through' },
  6: { label: 'Banned', cls: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }: { status: number }) {
  const s = STATUS_MAP[status] ?? { label: 'Unknown', cls: 'bg-slate-100 text-slate-500' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

function PermsBadges({ perms }: { perms: string[] }) {
  if (!perms.length) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {perms.map((p) => (
        <span key={p} className="inline-flex rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
          {PERMISSION_LABELS[p] ?? p}
        </span>
      ))}
    </div>
  );
}

function PermCheckboxes({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (perms: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {VENDOR_PERMISSIONS.map((perm) => {
        const checked = selected.includes(perm);
        return (
          <label
            key={perm}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              checked ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-emerald-600"
              checked={checked}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, perm] : selected.filter((p) => p !== perm))
              }
            />
            {PERMISSION_LABELS[perm] ?? perm}
          </label>
        );
      })}
    </div>
  );
}

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data && 'error' in data) {
    const e = (data as { error?: unknown }).error;
    if (typeof e === 'string' && e.trim()) return e;
  }
  return fallback;
}

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateModal({
  onClose,
  onCreated,
  sessionVendorId,
  isSuperAdmin,
  vendors,
}: {
  onClose: () => void;
  onCreated: () => void;
  sessionVendorId: string | undefined;
  isSuperAdmin: boolean;
  vendors: VendorOption[];
}) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const [form, setForm] = useState<UserFormState>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    mobileNumber: '',
    password: '',
    roleId: USER_ROLES.VENDOR_USER,
    vendorId: sessionVendorId ?? '',
    vendorTitle: '',
    permissions: ['manage_chat'],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(getApiError(data, t('failedCreateUser'))); return; }
    onCreated();
    onClose();
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{t('createUser')}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {error && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('firstNamePlaceholder')}</label>
            <input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('lastNamePlaceholder')}</label>
            <input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('username')}</label>
            <input required value={form.username} onChange={(e) => set('username', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('email')}</label>
            <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('mobile')}</label>
            <input value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('password')}</label>
            <input required minLength={8} type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('role')}</label>
            <select value={form.roleId} onChange={(e) => set('roleId', Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {isSuperAdmin && <option value={USER_ROLES.VENDOR}>{t('adminRole')}</option>}
              <option value={USER_ROLES.VENDOR_USER}>{t('employeeRole')}</option>
            </select>
          </div>
          {isSuperAdmin && form.roleId === USER_ROLES.VENDOR && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('workspaceName')}</label>
              <input value={form.vendorTitle} onChange={(e) => set('vendorTitle', e.target.value)}
                placeholder={t('workspacePlaceholder')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          )}
          {isSuperAdmin && form.roleId === USER_ROLES.VENDOR_USER && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('assignToAdminWorkspace')}</label>
              <select value={form.vendorId} onChange={(e) => set('vendorId', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value={sessionVendorId ?? ''}>{t('myWorkspace')}</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.title ?? v.uid}</option>
                ))}
              </select>
            </div>
          )}
          {form.roleId === USER_ROLES.VENDOR_USER && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{t('permissions')}</label>
              <PermCheckboxes selected={form.permissions} onChange={(perms) => set('permissions', perms)} />
            </div>
          )}
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              {tc('cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? tc('saving') : tc('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditModal({
  initial,
  isSuperAdmin,
  sessionUserId,
  onClose,
  onUpdated,
}: {
  initial: UserEditState;
  isSuperAdmin: boolean;
  sessionUserId: string | undefined;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const tc = useTranslations('common');
  const t = useTranslations('users');
  const [form, setForm] = useState<UserEditState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof UserEditState>(key: K, value: UserEditState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload: Record<string, unknown> = {
      userId: form.userId,
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      email: form.email,
      mobileNumber: form.mobileNumber,
      status: form.status,
      permissions: form.permissions,
    };
    if (form.password.trim()) payload.password = form.password;

    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(getApiError(data, 'Failed to update user.')); return; }
    onUpdated();
    onClose();
  }

  const isOwnAccount = form.userId === sessionUserId;

  const statusOptions = [
    { value: 1, label: 'Active' },
    { value: 2, label: 'Inactive' },
    { value: 3, label: 'Suspended' },
    { value: 4, label: 'Pending' },
    { value: 6, label: 'Banned' },
  ];

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{tc('edit')} — {form.firstName} {form.lastName}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {error && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('firstNamePlaceholder')}</label>
            <input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('lastNamePlaceholder')}</label>
            <input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('username')}</label>
            <input required value={form.username} onChange={(e) => set('username', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('email')}</label>
            <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('mobile')}</label>
            <input value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {!isOwnAccount && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('status')}</label>
              <select value={form.status} onChange={(e) => set('status', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className={isOwnAccount ? '' : ''}>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('password')} <span className="text-slate-400 font-normal text-xs">(leave blank to keep)</span></label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {form.roleId === USER_ROLES.VENDOR_USER && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{t('permissions')}</label>
              <PermCheckboxes selected={form.permissions} onChange={(perms) => set('permissions', perms)} />
            </div>
          )}
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              {tc('cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? tc('saving') : tc('update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const { data: session } = useSession();
  const sessionUser = session?.user as ExtendedSessionUser | undefined;

  const roleId = sessionUser?.roleId;
  const sessionUserId = sessionUser?.id;
  const sessionVendorId = sessionUser?.vendorId ?? undefined;
  const isSuperAdmin = roleId === USER_ROLES.SUPER_ADMIN;
  const isVendorAdmin = roleId === USER_ROLES.VENDOR;
  const canManageUsers = isSuperAdmin || isVendorAdmin;

  const [rows, setRows] = useState<UserRow[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserEditState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const query = isSuperAdmin ? '' : sessionVendorId ? `?vendorId=${encodeURIComponent(sessionVendorId)}` : '';
    const res = await fetch(`/api/users${query}`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [isSuperAdmin, sessionVendorId]);

  const fetchVendors = useCallback(async () => {
    if (!isSuperAdmin) return;
    const adminUsers = await fetch('/api/users?roleId=2').then((r) => r.json());
    const found = new Map<string, VendorOption>();
    for (const user of Array.isArray(adminUsers) ? adminUsers : []) {
      if (user?.vendor?.id) found.set(user.vendor.id, user.vendor);
    }
    setVendors(Array.from(found.values()));
  }, [isSuperAdmin]);

  useEffect(() => {
    void fetchUsers();
    void fetchVendors();
  }, [fetchUsers, fetchVendors]);

  function canManageRow(row: UserRow): boolean {
    if (isSuperAdmin) return true;
    if (isVendorAdmin) return row.roleId === USER_ROLES.VENDOR_USER && row.vendorId === sessionVendorId;
    return false;
  }

  function openEdit(row: UserRow) {
    setActionError('');
    setEditing({
      userId: row.id,
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      username: row.username ?? '',
      email: row.email ?? '',
      mobileNumber: row.mobileNumber ?? '',
      roleId: row.roleId,
      status: row.status,
      vendorId: row.vendorId ?? row.vendor?.id ?? '',
      permissions: row.vendorUserDetail?.permissions ?? [],
      password: '',
    });
  }

  async function banUser(id: string) {
    if (!confirm('Ban this user? They will not be able to login.')) return;
    setBusyId(id);
    const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, status: 6 }) });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) { setActionError(getApiError(data, 'Failed to ban user.')); return; }
    void fetchUsers();
  }

  async function unbanUser(id: string) {
    if (!confirm('Unban this user? They will be able to login again.')) return;
    setBusyId(id);
    const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, status: 1 }) });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) { setActionError(getApiError(data, 'Failed to unban user.')); return; }
    void fetchUsers();
  }

  async function deleteUser(id: string) {
    if (!confirm(tc('confirmDelete'))) return;
    setBusyId(id);
    setActionError('');
    const res = await fetch(`/api/users?userId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) { setActionError(getApiError(data, 'Failed to delete user.')); return; }
    void fetchUsers();
    void fetchVendors();
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.username?.toLowerCase().includes(q) ||
        r.mobileNumber?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{rows.length} {tc('results')}</p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => { setActionError(''); setShowCreate(true); }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + {t('createUser')}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tc('search') + '…'}
          className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
            {tc('close')}
          </button>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{actionError}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-[13px] text-slate-600">
            <thead className="border-b border-emerald-100 bg-emerald-50/60 text-[11px] uppercase tracking-[0.1em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t('name')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('username')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('email')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('mobile')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('role')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('permissions')}</th>
                <th className="px-4 py-3 text-start font-semibold">{tc('status')}</th>
                {canManageUsers && <th className="px-4 py-3 text-start font-semibold">{tc('actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td colSpan={canManageUsers ? 8 : 7} className="py-10 text-center text-slate-400">{tc('loading')}</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={canManageUsers ? 8 : 7} className="py-10 text-center text-slate-400">{tc('noData')}</td>
                </tr>
              )}
              {filtered.map((row) => {
                const perms = row.vendorUserDetail?.permissions ?? [];
                const canManage = canManageRow(row);
                const isCurrentUser = row.id === sessionUserId;
                const busy = busyId === row.id;
                return (
                  <tr key={row.id} className="hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.firstName} {row.lastName}
                      {isCurrentUser && (
                        <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">You</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">@{row.username}</td>
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3 text-slate-500">{row.mobileNumber ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {row.roleId === USER_ROLES.SUPER_ADMIN && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">{t('superAdminRole')}</span>}
                      {row.roleId === USER_ROLES.VENDOR && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{t('adminRole')}</span>}
                      {row.roleId === USER_ROLES.VENDOR_USER && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{t('employeeRole')}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.roleId === USER_ROLES.VENDOR_USER
                        ? <PermsBadges perms={perms} />
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    {canManageUsers && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => openEdit(row)}
                            className="font-medium text-emerald-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                          >
                            {tc('edit')}
                          </button>
                          {canManage && row.status === 1 && (
                            <button type="button" disabled={busy} onClick={() => banUser(row.id)}
                              className="font-medium text-amber-600 hover:underline disabled:opacity-40">
                              Ban
                            </button>
                          )}
                          {canManage && row.status === 6 && (
                            <button type="button" disabled={busy} onClick={() => unbanUser(row.id)}
                              className="font-medium text-blue-600 hover:underline disabled:opacity-40">
                              Unban
                            </button>
                          )}
                          {canManage && !isCurrentUser && (
                            <button type="button" disabled={busy} onClick={() => deleteUser(row.id)}
                              className="font-medium text-red-500 hover:underline disabled:opacity-40">
                              {busy ? '…' : tc('delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {mounted && showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { void fetchUsers(); void fetchVendors(); }}
          sessionVendorId={sessionVendorId}
          isSuperAdmin={isSuperAdmin}
          vendors={vendors}
        />
      )}
      {mounted && editing && (
        <EditModal
          initial={editing}
          isSuperAdmin={isSuperAdmin}
          sessionUserId={sessionUserId}
          onClose={() => setEditing(null)}
          onUpdated={() => { void fetchUsers(); }}
        />
      )}
    </div>
  );
}
