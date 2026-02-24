'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data && 'error' in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim().length > 0) return error;
  }
  return fallback;
}

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

  const [rows, setRows] = useState<UserRow[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserEditState | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    permissions: ['manage_chat'] as string[],
  });

  const canManageUsers = isSuperAdmin || isVendorAdmin;

  const filteredRoleChoices = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { id: USER_ROLES.VENDOR, label: t('adminRole') },
        { id: USER_ROLES.VENDOR_USER, label: t('employeeRole') },
      ];
    }
    return [{ id: USER_ROLES.VENDOR_USER, label: t('employeeRole') }];
  }, [isSuperAdmin, t]);

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
      if (user?.vendor?.id) {
        found.set(user.vendor.id, user.vendor);
      }
    }
    setVendors(Array.from(found.values()));
  }, [isSuperAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUsers();
      void fetchVendors();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, fetchVendors]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageUsers) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? t('failedCreateUser'));
      return;
    }

    setShowForm(false);
    setForm({
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
    fetchUsers();
    fetchVendors();
  }

  function canManageRow(row: UserRow): boolean {
    if (isSuperAdmin) return true;
    if (isVendorAdmin) return row.roleId === USER_ROLES.VENDOR_USER && row.vendorId === sessionVendorId;
    return false;
  }

  function startEdit(row: UserRow) {
    setError('');
    setActionError('');
    setShowForm(false);
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

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setUpdating(true);
    setActionError('');

    const payload: Record<string, unknown> = {
      userId: editing.userId,
      firstName: editing.firstName,
      lastName: editing.lastName,
      username: editing.username,
      email: editing.email,
      mobileNumber: editing.mobileNumber,
      status: editing.status,
      permissions: editing.permissions,
    };

    if (editing.password.trim().length > 0) {
      payload.password = editing.password;
    }

    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setUpdating(false);

    if (!res.ok) {
      setActionError(getApiErrorMessage(data, 'Failed to update user.'));
      return;
    }

    setEditing(null);
    fetchUsers();
    fetchVendors();
  }

  async function deleteUser(id: string) {
    if (!confirm(tc('confirmDelete'))) return;
    setDeletingId(id);
    setActionError('');

    const res = await fetch(`/api/users?userId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setDeletingId(null);

    if (!res.ok) {
      setActionError(getApiErrorMessage(data, 'Failed to delete user.'));
      return;
    }

    if (editing?.userId === id) {
      setEditing(null);
    }
    fetchUsers();
    fetchVendors();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{rows.length} {tc('results')}</p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
          >
            {showForm ? tc('cancel') : t('createUser')}
          </button>
        )}
      </div>

      {showForm && canManageUsers && (
        <form onSubmit={createUser} className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-emerald-100 bg-white p-6 md:grid-cols-2">
          {error && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('name')}</label>
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={t('firstNamePlaceholder')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('name')}</label>
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={t('lastNamePlaceholder')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('username')}</label>
            <input
              required
              value={form.username}
              onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('email')}</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('mobile')}</label>
            <input
              value={form.mobileNumber}
              onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('permissions')}</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm((s) => ({ ...s, roleId: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {filteredRoleChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('password')}</label>
            <input
              required
              minLength={8}
              type="password"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {isSuperAdmin && form.roleId === USER_ROLES.VENDOR && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('workspaceName')}</label>
              <input
                value={form.vendorTitle}
                onChange={(e) => setForm((s) => ({ ...s, vendorTitle: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('workspacePlaceholder')}
              />
            </div>
          )}
          {isSuperAdmin && form.roleId === USER_ROLES.VENDOR_USER && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('assignToAdminWorkspace')}</label>
              <select
                value={form.vendorId}
                onChange={(e) => setForm((s) => ({ ...s, vendorId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value={sessionVendorId ?? ''}>{t('myWorkspace')}</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title ?? v.uid}
                  </option>
                ))}
              </select>
            </div>
          )}
          {form.roleId === USER_ROLES.VENDOR_USER && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">{t('permissions')}</label>
              <div className="flex flex-wrap gap-2">
                {VENDOR_PERMISSIONS.map((perm) => {
                  const checked = form.permissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs ${checked ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-gray-300 bg-white text-gray-600'}`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            permissions: e.target.checked
                              ? [...s.permissions, perm]
                              : s.permissions.filter((p) => p !== perm),
                          }))
                        }
                      />
                      {perm}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? tc('saving') : tc('create')}
            </button>
          </div>
        </form>
      )}

      {editing && canManageUsers && (
        <form onSubmit={updateUser} className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-blue-100 bg-white p-6 md:grid-cols-2">
          {(actionError || error) && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError || error}
            </div>
          )}
          <div className="md:col-span-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{tc('edit')} {t('title')}</h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              {tc('cancel')}
            </button>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('name')}</label>
            <input
              required
              value={editing.firstName}
              onChange={(e) => setEditing((s) => (s ? { ...s, firstName: e.target.value } : s))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('name')}</label>
            <input
              required
              value={editing.lastName}
              onChange={(e) => setEditing((s) => (s ? { ...s, lastName: e.target.value } : s))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('username')}</label>
            <input
              required
              value={editing.username}
              onChange={(e) => setEditing((s) => (s ? { ...s, username: e.target.value } : s))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('email')}</label>
            <input
              required
              type="email"
              value={editing.email}
              onChange={(e) => setEditing((s) => (s ? { ...s, email: e.target.value } : s))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('mobile')}</label>
            <input
              value={editing.mobileNumber}
              onChange={(e) => setEditing((s) => (s ? { ...s, mobileNumber: e.target.value } : s))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('status')}</label>
            <select
              value={editing.status}
              onChange={(e) => setEditing((s) => (s ? { ...s, status: Number(e.target.value) } : s))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={1}>{tc('active')}</option>
              <option value={2}>{tc('inactive')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('password')}</label>
            <input
              type="password"
              value={editing.password}
              onChange={(e) => setEditing((s) => (s ? { ...s, password: e.target.value } : s))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Leave blank to keep current password"
            />
          </div>
          {editing.roleId === USER_ROLES.VENDOR_USER && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">{t('permissions')}</label>
              <div className="flex flex-wrap gap-2">
                {VENDOR_PERMISSIONS.map((perm) => {
                  const checked = editing.permissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs ${checked ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-gray-300 bg-white text-gray-600'}`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={(e) =>
                          setEditing((s) =>
                            s
                              ? {
                                  ...s,
                                  permissions: e.target.checked
                                    ? [...s.permissions, perm]
                                    : s.permissions.filter((p) => p !== perm),
                                }
                              : s
                          )
                        }
                      />
                      {perm}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={updating}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {updating ? tc('saving') : tc('update')}
            </button>
          </div>
        </form>
      )}

      {actionError && !editing && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-emerald-100 bg-emerald-50/60">
            <tr>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{t('name')}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{t('email')}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{t('role')}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{t('permissions')}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tc('status')}</th>
              {canManageUsers && <th className="px-4 py-3 text-start font-medium text-gray-600">{tc('actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={canManageUsers ? 6 : 5} className="py-10 text-center text-gray-400">{tc('loading')}</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={canManageUsers ? 6 : 5} className="py-10 text-center text-gray-400">{tc('noData')}</td>
              </tr>
            )}
            {rows.map((row) => {
              const perms = row.vendorUserDetail?.permissions ?? [];
              const canManageThisRow = canManageRow(row);
              const isCurrentUser = row.id === sessionUserId;
              return (
                <tr key={row.id} className="hover:bg-emerald-50/40">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.firstName} {row.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.email}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.roleId === USER_ROLES.SUPER_ADMIN ? t('superAdminRole') : row.roleId === USER_ROLES.VENDOR ? t('adminRole') : t('employeeRole')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {perms.length === 0 ? tc('na') : perms.join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${row.status === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                      {row.status === 1 ? tc('active') : tc('inactive')}
                    </span>
                  </td>
                  {canManageUsers && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          disabled={!canManageThisRow}
                          onClick={() => startEdit(row)}
                          className="text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          {tc('edit')}
                        </button>
                        <button
                          type="button"
                          disabled={!canManageThisRow || isCurrentUser || deletingId === row.id}
                          onClick={() => deleteUser(row.id)}
                          className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          {deletingId === row.id ? tc('loading') : tc('delete')}
                        </button>
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
  );
}
