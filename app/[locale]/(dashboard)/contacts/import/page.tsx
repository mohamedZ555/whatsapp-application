'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function ImportContactsPage() {
  const t = useTranslations('contacts');
  const tc = useTranslations('common');

  const [bulk, setBulk] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ created: number; failed: number } | null>(null);

  async function handleImport(e: FormEvent) {
    e.preventDefault();
    const numbers = bulk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (numbers.length === 0) return;

    setLoading(true);
    let created = 0;
    let failed = 0;

    for (const waId of numbers) {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waId }),
      });
      if (res.ok) created += 1;
      else failed += 1;
    }

    setLoading(false);
    setSummary({ created, failed });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('importContacts')}</h1>
      <form onSubmit={handleImport} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
        <p className="text-sm text-gray-500 mb-3">{t('importHint')}</p>
        <textarea
          rows={10}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={'15551234567\n15559876543'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={loading} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {loading ? tc('loading') : t('importContacts')}
          </button>
          {summary && (
            <p className="text-sm text-gray-600">
              {t('imported')}: <span className="font-semibold text-emerald-700">{summary.created}</span>, {t('failed')}: <span className="font-semibold text-red-600">{summary.failed}</span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
