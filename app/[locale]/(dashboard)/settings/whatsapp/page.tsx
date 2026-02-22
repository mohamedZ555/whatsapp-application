'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function SettingsWhatsappPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [form, setForm] = useState({ whatsapp_phone_number_id: '', whatsapp_verify_token: '', whatsapp_access_token: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) =>
        setForm({
          whatsapp_phone_number_id: data.whatsapp_phone_number_id ?? '',
          whatsapp_verify_token: data.whatsapp_verify_token ?? '',
          whatsapp_access_token: data.whatsapp_access_token ?? '',
        })
      )
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
  }

  return (
    <div className="max-w-3xl bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('whatsapp')}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('phoneNumber')}</label>
          <input
            value={form.whatsapp_phone_number_id}
            onChange={(e) => setForm((s) => ({ ...s, whatsapp_phone_number_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
          <input
            value={form.whatsapp_verify_token}
            onChange={(e) => setForm((s) => ({ ...s, whatsapp_verify_token: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
          <input
            value={form.whatsapp_access_token}
            onChange={(e) => setForm((s) => ({ ...s, whatsapp_access_token: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" disabled={saving} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {saving ? tc('saving') : tc('save')}
        </button>
      </form>
    </div>
  );
}
