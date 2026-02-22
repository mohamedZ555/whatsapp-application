'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export default function NewContactPage() {
  const t = useTranslations('contacts');
  const tc = useTranslations('common');
  const router = useRouter();

  const [groups, setGroups] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    waId: '',
    groupIds: [] as string[],
  });

  useEffect(() => {
    fetch('/api/contacts/groups')
      .then((r) => r.json())
      .then((d) => setGroups(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (res.ok) router.push('/contacts');
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('addContact')}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')}</label>
          <input
            value={form.firstName}
            onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')}</label>
          <input
            value={form.lastName}
            onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
          <input
            required
            value={form.waId}
            onChange={(e) => setForm((s) => ({ ...s, waId: e.target.value }))}
            placeholder="15551234567"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('groups')}</label>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => {
              const checked = form.groupIds.includes(group.id);
              return (
                <label key={group.id} className={`px-3 py-1.5 text-sm rounded-lg border cursor-pointer ${checked ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-gray-300 text-gray-600'}`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checked}
                    onChange={(e) => {
                      setForm((s) => ({
                        ...s,
                        groupIds: e.target.checked
                          ? [...s.groupIds, group.id]
                          : s.groupIds.filter((id) => id !== group.id),
                      }));
                    }}
                  />
                  {group.name}
                </label>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-2 flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {saving ? tc('saving') : tc('create')}
          </button>
          <button type="button" onClick={() => router.push('/contacts')} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            {tc('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
