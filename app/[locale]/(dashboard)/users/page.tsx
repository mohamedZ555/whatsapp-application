'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { USER_ROLES, VENDOR_PERMISSIONS } from '@/lib/constants';

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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

export default function UsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const { data: session } = useSession();

  const roleId = (session?.user as any)?.roleId as number | undefined;
  const sessionVendorId = (session?.user as any)?.vendorId as string | undefined;
  const isSuperAdmin = roleId === USER_ROLES.SUPER_ADMIN;
  const isVendorAdmin = roleId === USER_ROLES.VENDOR;

  const [rows, setRows] = useState<UserRow[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

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

  async function fetchUsers() {
    setLoading(true);
    const query = isSuperAdmin ? '' : sessionVendorId ? `?vendorId=${encodeURIComponent(sessionVendorId)}` : '';
    const res = await fetch(`/api/users${query}`);
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function fetchVendors() {
    if (!isSuperAdmin) return;
    const adminUsers = await fetch('/api/users?roleId=2').then((r) => r.json());
    const found = new Map<string, VendorOption>();
    for (const user of Array.isArray(adminUsers) ? adminUsers : []) {
      if (user?.vendor?.id) {
        found.set(user.vendor.id, user.vendor);
      }
    }
    setVendors(Array.from(found.values()));
  }

  useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, [isSuperAdmin, sessionVendorId]);

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

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-emerald-100 bg-emerald-50/60">
            <tr>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{t('name')}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{t('email')}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{t('role')}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{t('permissions')}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tc('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400">{tc('loading')}</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400">{tc('noData')}</td>
              </tr>
            )}
            {rows.map((row) => {
              const perms = row.vendorUserDetail?.permissions ?? [];
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
