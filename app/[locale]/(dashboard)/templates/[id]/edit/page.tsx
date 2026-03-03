'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

interface Button {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'en_US', label: 'English (US)' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (BR)' },
  { code: 'tr', label: 'Turkish' },
  { code: 'id', label: 'Indonesian' },
];

export default function TemplateEditPage() {
  const t = useTranslations('templates');
  const tc = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('MARKETING');
  const [headerType, setHeaderType] = useState<HeaderType>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<Button[]>([]);
  const [templateStatus, setTemplateStatus] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load template
  useEffect(() => {
    if (!id) return;
    fetch(`/api/whatsapp/templates/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setName(data.templateName ?? '');
        setLanguage(data.languageCode ?? 'en');
        setCategory(data.category ?? 'MARKETING');
        setTemplateStatus(data.templateStatus ?? '');

        const comps: any[] = data.data?.components ?? [];

        const header = comps.find((c: any) => c.type === 'HEADER');
        if (header) {
          setHeaderType(header.format as HeaderType);
          if (header.format === 'TEXT') setHeaderText(header.text ?? '');
        }

        const body = comps.find((c: any) => c.type === 'BODY');
        if (body) setBodyText(body.text ?? '');

        const footer = comps.find((c: any) => c.type === 'FOOTER');
        if (footer) setFooterText(footer.text ?? '');

        const btnsComp = comps.find((c: any) => c.type === 'BUTTONS');
        if (btnsComp?.buttons) {
          setButtons(btnsComp.buttons.map((b: any) => ({
            type: b.type as ButtonType,
            text: b.text ?? '',
            url: b.url,
            phone_number: b.phone_number,
          })));
        }

        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  function addVariable(setter: (v: string) => void, current: string) {
    const varCount = (current.match(/\{\{\d+\}\}/g) ?? []).length;
    setter(current + `{{${varCount + 1}}}`);
  }

  function addButton() {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
  }

  function removeButton(i: number) {
    setButtons(buttons.filter((_, idx) => idx !== i));
  }

  function updateButton(i: number, field: keyof Button, value: string) {
    setButtons(buttons.map((b, idx) => idx === i ? { ...b, [field]: value } : b));
  }

  function buildComponents() {
    const comps: any[] = [];
    if (headerType !== 'NONE') {
      if (headerType === 'TEXT') {
        comps.push({ type: 'HEADER', format: 'TEXT', text: headerText });
      } else {
        comps.push({ type: 'HEADER', format: headerType, example: { header_handle: [''] } });
      }
    }
    if (bodyText) comps.push({ type: 'BODY', text: bodyText });
    if (footerText) comps.push({ type: 'FOOTER', text: footerText });
    if (buttons.length > 0) {
      comps.push({
        type: 'BUTTONS',
        buttons: buttons.map((b) => {
          if (b.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: b.text };
          if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.url ?? '' };
          return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number ?? '' };
        }),
      });
    }
    return comps;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!bodyText.trim()) { setError('Body text is required.'); return; }
    setSaving(true);
    const res = await fetch(`/api/whatsapp/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ components: buildComponents(), category }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Failed to update template.'); return; }
    setSuccess(true);
    setTimeout(() => router.push('/templates'), 1500);
  }

  const previewBodyDisplay = bodyText
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~(.+?)~/g, '<s>$1</s>')
    .replace(/\{\{(\d+)\}\}/g, '<span class="bg-yellow-100 text-yellow-800 px-1 rounded text-xs">{{$1}}</span>');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-24">
        <p className="text-2xl font-bold text-gray-700 mb-2">Template Not Found</p>
        <p className="text-gray-400 mb-6">This template does not exist or you don&apos;t have access to it.</p>
        <Link href="/templates" className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          Back to Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/templates" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Template</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-500 font-mono">{name}</span>
              {templateStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  templateStatus === 'APPROVED' ? 'bg-green-50 text-green-700' :
                  templateStatus === 'REJECTED' ? 'bg-red-50 text-red-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>
                  {templateStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Template updated successfully! Redirecting...
          </div>
        )}

        {templateStatus === 'APPROVED' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            <strong>Note:</strong> Editing an approved template will require WhatsApp to re-review it. It may be temporarily unavailable.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Language + Category */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('templateName')}</label>
              <input
                type="text"
                value={name}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Template name cannot be changed after creation.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('language')}</label>
                <input
                  type="text"
                  value={LANGUAGES.find((l) => l.code === language)?.label ?? language}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')} <span className="text-red-500">*</span></label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="MARKETING">{t('marketing')}</option>
                  <option value="UTILITY">{t('utility')}</option>
                  <option value="AUTHENTICATION">{t('authentication')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-3">
              {t('header')} <span className="text-xs text-gray-400 font-normal">({tc('optional')})</span>
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Header Type</label>
              <select
                value={headerType}
                onChange={(e) => setHeaderType(e.target.value as HeaderType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="NONE">None</option>
                <option value="TEXT">Text</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
              </select>
            </div>
            {headerType === 'TEXT' && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Header Text</label>
                  <button
                    type="button"
                    onClick={() => addVariable(setHeaderText, headerText)}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    + {t('addVariable')}
                  </button>
                </div>
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  maxLength={60}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">{headerText.length}/60</p>
              </div>
            )}
            {(headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                {headerType} will be provided when sending the template message.
              </div>
            )}
          </div>

          {/* Body */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">{t('body')} <span className="text-red-500">*</span></h3>
              <button
                type="button"
                onClick={() => addVariable(setBodyText, bodyText)}
                className="text-xs text-green-600 hover:text-green-700 font-medium"
              >
                + {t('addVariable')}
              </button>
            </div>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={5}
              maxLength={1024}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-400">Use *bold*, _italic_, ~strikethrough~, {'{{1}}'} for variables</p>
              <p className="text-xs text-gray-400">{bodyText.length}/1024</p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-3">
              {t('footer')} <span className="text-xs text-gray-400 font-normal">({tc('optional')})</span>
            </h3>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              maxLength={60}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">{footerText.length}/60</p>
          </div>

          {/* Buttons */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">
                {t('buttons')} <span className="text-xs text-gray-400 font-normal">({tc('optional')})</span>
              </h3>
              {buttons.length < 3 && (
                <button
                  type="button"
                  onClick={addButton}
                  className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 font-medium"
                >
                  + Add Button
                </button>
              )}
            </div>
            <div className="space-y-3">
              {buttons.map((btn, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">Button {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeButton(i)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Type</label>
                      <select
                        value={btn.type}
                        onChange={(e) => updateButton(i, 'type', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="QUICK_REPLY">Quick Reply</option>
                        <option value="URL">Visit URL</option>
                        <option value="PHONE_NUMBER">Call Number</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Button Text</label>
                      <input
                        type="text"
                        value={btn.text}
                        onChange={(e) => updateButton(i, 'text', e.target.value)}
                        maxLength={25}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  {btn.type === 'URL' && (
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">URL</label>
                      <input
                        type="url"
                        value={btn.url ?? ''}
                        onChange={(e) => updateButton(i, 'url', e.target.value)}
                        placeholder="https://example.com"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  )}
                  {btn.type === 'PHONE_NUMBER' && (
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Phone Number</label>
                      <input
                        type="tel"
                        value={btn.phone_number ?? ''}
                        onChange={(e) => updateButton(i, 'phone_number', e.target.value)}
                        placeholder="+1234567890"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {saving ? tc('saving') : tc('save')}
            </button>
            <Link href="/templates" className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              {tc('cancel')}
            </Link>
          </div>
        </form>
      </div>

      {/* Live Preview */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <div className="sticky top-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Template Preview</h3>
          <div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-[300px] shadow-inner">
            <div className="bg-white rounded-xl shadow-sm max-w-[90%] overflow-hidden">
              {/* Header */}
              {headerType === 'TEXT' && headerText && (
                <div className="px-3 pt-3 pb-2 border-b">
                  <p className="font-semibold text-gray-800 text-sm">{headerText}</p>
                </div>
              )}
              {(headerType === 'IMAGE' || headerType === 'VIDEO') && (
                <div className="bg-gray-200 h-32 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {headerType === 'DOCUMENT' && (
                <div className="bg-blue-50 p-3 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-blue-700">Document</span>
                </div>
              )}

              {/* Body */}
              <div className="px-3 py-2">
                {bodyText ? (
                  <p
                    className="text-gray-800 text-sm whitespace-pre-line leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewBodyDisplay }}
                  />
                ) : (
                  <p className="text-gray-300 text-sm italic">Body text will appear here...</p>
                )}
              </div>

              {/* Footer */}
              {footerText && (
                <div className="px-3 pb-2">
                  <p className="text-xs text-gray-400">{footerText}</p>
                </div>
              )}

              <div className="px-3 pb-2 flex justify-end">
                <span className="text-xs text-gray-400">10:30 AM ✓✓</span>
              </div>

              {/* Buttons */}
              {buttons.length > 0 && (
                <div className="border-t divide-y">
                  {buttons.map((btn, i) => (
                    <div key={i} className="text-center py-2 text-blue-500 text-sm font-medium">
                      {btn.type === 'URL' && '🔗 '}
                      {btn.type === 'PHONE_NUMBER' && '📞 '}
                      {btn.text || `Button ${i + 1}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 leading-relaxed">
            Changes will be submitted to WhatsApp for re-review. Template name and language cannot be changed.
          </div>
        </div>
      </div>
    </div>
  );
}
