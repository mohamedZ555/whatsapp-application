'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function BotRepliesPage() {
  const t = useTranslations('bot');
  const tc = useTranslations('common');
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ replyName: '', triggerType: 'is', triggerSubject: '', replyMessage: '', replyType: 'text' });
  const [saving, setSaving] = useState(false);

  async function fetchReplies() {
    setLoading(true);
    const res = await fetch('/api/bot-replies');
    const data = await res.json();
    setReplies(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/bot-replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    setForm({ replyName: '', triggerType: 'is', triggerSubject: '', replyMessage: '', replyType: 'text' });
    fetchReplies();
  }

  useEffect(() => { fetchReplies(); }, []);

  const triggerTypes = ['welcome', 'is', 'starts_with', 'ends_with', 'contains_word', 'contains', 'stop_promotional', 'start_promotional', 'start_ai_bot', 'stop_ai_bot'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
          {t('createBotReply')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">{t('createBotReply')}</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('replyName')}</label>
              <input value={form.replyName} onChange={e => setForm({...form, replyName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('triggerType')}</label>
              <select value={form.triggerType} onChange={e => setForm({...form, triggerType: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {triggerTypes.map(tt => <option key={tt} value={tt}>{t(tt.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as any)}</option>)}
              </select>
            </div>
            {form.triggerType !== 'welcome' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('triggerSubject')}</label>
                <input value={form.triggerSubject} onChange={e => setForm({...form, triggerSubject: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('replyMessage')}</label>
              <textarea value={form.replyMessage} onChange={e => setForm({...form, replyMessage: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-60">{saving ? tc('saving') : tc('save')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{tc('cancel')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading && <div className="text-center py-8 text-gray-400">{tc('loading')}</div>}
        {!loading && replies.length === 0 && <div className="bg-white rounded-xl border border-gray-100 py-12 text-center text-gray-400">{tc('noData')}</div>}
        {replies.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">{r.replyName}</span>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{r.triggerType}</span>
                  {r.triggerSubject && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">"{r.triggerSubject}"</span>}
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{r.replyType}</span>
                </div>
              </div>
            </div>
            {r.replyMessage && <p className="text-sm text-gray-600 mt-2 truncate">{r.replyMessage}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
