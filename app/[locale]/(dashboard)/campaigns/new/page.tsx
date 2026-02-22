'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export default function CampaignNewPage() {
  const t = useTranslations('campaigns');
  const tc = useTranslations('common');
  const router = useRouter();

  const [templates, setTemplates] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    templateId: '',
    scheduledAt: '',
    contactIds: [] as string[],
  });

  useEffect(() => {
    Promise.all([fetch('/api/whatsapp/templates'), fetch('/api/contacts?limit=100')])
      .then(async ([templatesRes, contactsRes]) => {
        const templatesData = await templatesRes.json();
        const contactsData = await contactsRes.json();
        setTemplates(Array.isArray(templatesData) ? templatesData : []);
        setContacts(Array.isArray(contactsData?.data) ? contactsData.data : []);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        templateId: form.templateId || null,
        scheduledAt: form.scheduledAt || null,
      }),
    });

    setSaving(false);
    if (res.ok) router.push('/campaigns');
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('createCampaign')}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('campaignName')}</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectTemplate')}</label>
            <select
              value={form.templateId}
              onChange={(e) => setForm((s) => ({ ...s, templateId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">No template</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.templateName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('scheduledFor')}</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((s) => ({ ...s, scheduledAt: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('selectRecipients')}</label>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {contacts.map((contact) => {
              const checked = form.contactIds.includes(contact.id);
              const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.waId;
              return (
                <label key={contact.id} className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <span className="text-gray-700">{name}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setForm((s) => ({
                        ...s,
                        contactIds: e.target.checked
                          ? [...s.contactIds, contact.id]
                          : s.contactIds.filter((id) => id !== contact.id),
                      }));
                    }}
                  />
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {saving ? tc('saving') : t('createCampaign')}
          </button>
          <button type="button" onClick={() => router.push('/campaigns')} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            {tc('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
