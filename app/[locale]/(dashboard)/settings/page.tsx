'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { setSettings(d); setLoading(false); });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  function set(key: string, value: string) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <span
          className="px-4 py-2.5 text-sm font-medium text-emerald-600 border-b-2 border-emerald-600"
        >
          {t('general')}
        </span>
        <Link
          href="/settings/whatsapp"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 transition-colors"
        >
          {t('whatsapp')}
        </Link>
        <Link
          href="/settings/profile"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 transition-colors"
        >
          {t('profile')}
        </Link>
        <Link
          href="/settings/job-categories"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 transition-colors"
        >
          Job Categories
        </Link>
      </div>

      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-4">{tc('success')}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { key: 'name', label: t('businessName') },
            { key: 'contact_email', label: t('businessEmail') },
            { key: 'contact_phone', label: t('businessPhone') },
            { key: 'address', label: t('address') },
            { key: 'city', label: t('city') },
            { key: 'state', label: t('state') },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                value={settings[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-60">
              {saving ? tc('saving') : tc('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
