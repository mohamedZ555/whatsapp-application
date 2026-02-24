'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const COMMON_CONFIG_KEYS = [
  'app_name',
  'allow_registration',
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_pass',
  'currency',
];

export default function AdminConfigurationGeneralPage() {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');

  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((data: Array<{ configKey: string; configValue: string | null }>) => {
        const map: Record<string, string> = {};
        // Seed with empty defaults for common keys
        for (const key of COMMON_CONFIG_KEYS) {
          map[key] = '';
        }
        if (Array.isArray(data)) {
          for (const cfg of data) {
            map[cfg.configKey] = cfg.configValue ?? '';
          }
        }
        setConfigs(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const pairs = Object.entries(configs).map(([configKey, configValue]) => ({
        configKey,
        configValue,
      }));
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: pairs }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Silently handle errors
    } finally {
      setSaving(false);
    }
  }

  function handleChange(key: string, value: string) {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  }

  const allKeys = Array.from(
    new Set([...COMMON_CONFIG_KEYS, ...Object.keys(configs)])
  );

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold text-emerald-950">{tAdmin('generalConfiguration')}</h1>

      {saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          {tCommon('savedSuccessfully')}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-400">{tCommon('loading')}</div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allKeys.map((key) => (
              <div key={key} className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                  {key}
                </label>
                <input
                  type={key === 'smtp_pass' ? 'password' : 'text'}
                  value={configs[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? tCommon('saving') : tCommon('save')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
