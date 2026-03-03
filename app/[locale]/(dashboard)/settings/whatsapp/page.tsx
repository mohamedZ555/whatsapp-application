'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import SettingsTabs from '@/components/layout/settings-tabs';

type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'not_configured' | 'failed';

interface PhoneInfo {
  display_phone_number?: string;
  quality_rating?: string;
  verified_name?: string;
}

export default function SettingsWhatsappPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { data: session } = useSession();
  const vendorUid = (session?.user as { vendorUid?: string } | undefined)?.vendorUid;

  const [form, setForm] = useState({
    current_phone_number_id: '',
    whatsapp_business_account_id: '',
    whatsapp_access_token: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');

  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle');
  const [connPhones, setConnPhones] = useState<PhoneInfo[]>([]);
  const [connError, setConnError] = useState('');

  const [guideOpen, setGuideOpen] = useState(false);

  const webhookUrl =
    typeof window !== 'undefined' && vendorUid
      ? `${window.location.origin}/api/webhooks/whatsapp/${vendorUid}`
      : '';

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) =>
        setForm({
          current_phone_number_id: data.current_phone_number_id ?? data.whatsapp_phone_number_id ?? '',
          whatsapp_business_account_id: data.whatsapp_business_account_id ?? '',
          whatsapp_access_token: data.whatsapp_access_token ?? '',
        })
      )
      .catch(() => {});

    fetch('/api/whatsapp/webhook-token')
      .then((r) => r.json())
      .then((data) => { if (data.verifyToken) setVerifyToken(data.verifyToken); })
      .catch(() => {});

    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkConnection() {
    setConnStatus('checking');
    setConnError('');
    setConnPhones([]);
    try {
      const res = await fetch('/api/whatsapp/test-connection');
      const data = await res.json();
      if (data.status === 'connected') {
        setConnStatus('connected');
        setConnPhones(data.phones ?? []);
      } else if (data.status === 'not_configured') {
        setConnStatus('not_configured');
      } else {
        setConnStatus('failed');
        setConnError(data.message ?? t('connectionFailed'));
      }
    } catch {
      setConnStatus('failed');
      setConnError(t('connectionFailed'));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleCopy(text: string, type: 'webhook' | 'token') {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  }

  function statusBadge() {
    const configs: Record<string, { bg: string; text: string; border: string; dot: string; label: string; pulse?: boolean }> = {
      checking:      { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400', label: t('checking'), pulse: true },
      connected:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: t('connected') },
      not_configured:{ bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400', label: t('notConfigured') },
      failed:        { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: t('connectionFailed') },
      idle:          { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400', label: t('unknown') },
    };
    const cfg = configs[connStatus] ?? configs.idle;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
        {cfg.label}
      </span>
    );
  }

  const setupSteps = [
    t('setupStep1'), t('setupStep2'), t('setupStep3'),
    t('setupStep4'), t('setupStep5'), t('setupStep6'), t('setupStep7'),
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Navigation Tabs */}
      <SettingsTabs activeTab="whatsapp" />

      {/* Success Toast */}
      {saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{tc('savedSuccessfully')}</span>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t('connectionStatus')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('connectionStatusDesc')}</p>
          </div>
          {statusBadge()}
        </div>

        {connStatus === 'connected' && connPhones.length > 0 && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-1">
            {connPhones.map((p, i) => (
              <div key={i} className="flex flex-wrap gap-4 text-sm">
                {p.display_phone_number && (
                  <span className="text-emerald-800 font-medium">{p.display_phone_number}</span>
                )}
                {p.verified_name && (
                  <span className="text-emerald-700">{p.verified_name}</span>
                )}
                {p.quality_rating && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.quality_rating === 'GREEN' ? 'bg-green-100 text-green-700' :
                    p.quality_rating === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {t('qualityRating')}: {p.quality_rating}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {connStatus === 'failed' && connError && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            {connError}
          </div>
        )}

        <button
          type="button"
          onClick={checkConnection}
          disabled={connStatus === 'checking'}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {connStatus === 'checking' ? t('testing') : t('testConnection')}
        </button>
      </div>

      {/* Webhook Configuration Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{t('webhookConfiguration')}</h2>
        <p className="text-xs text-gray-500 mb-4">{t('webhookConfigDesc')}</p>

        {/* Webhook URL */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('webhookUrl')}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 cursor-text select-all"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={() => handleCopy(webhookUrl, 'webhook')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copiedWebhook ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copiedWebhook ? tc('copied') : tc('copy')}
            </button>
          </div>
        </div>

        {/* Verify Token */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('verifyToken')}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={verifyToken}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 cursor-text select-all font-mono"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={() => handleCopy(verifyToken, 'token')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copiedToken ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copiedToken ? tc('copied') : tc('copy')}
            </button>
          </div>
        </div>

        {/* Subscribed fields */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">{t('subscribeWebhookFields')}</p>
          <div className="flex flex-wrap gap-2">
            {['messages', 'message_deliveries', 'message_reads'].map((field) => (
              <span key={field} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {field}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* API Credentials Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{t('apiCredentials')}</h2>
        <p className="text-xs text-gray-500 mb-5">{t('apiCredentialsDesc')}</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('phoneNumberId')}</label>
            <input
              value={form.current_phone_number_id}
              onChange={(e) => setForm((s) => ({ ...s, current_phone_number_id: e.target.value }))}
              placeholder="e.g. 123456789012345"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('businessAccountId')}</label>
            <input
              value={form.whatsapp_business_account_id}
              onChange={(e) => setForm((s) => ({ ...s, whatsapp_business_account_id: e.target.value }))}
              placeholder="e.g. 987654321098765"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('permanentAccessToken')}</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.whatsapp_access_token}
                onChange={(e) => setForm((s) => ({ ...s, whatsapp_access_token: e.target.value }))}
                placeholder="EAAxxxxx..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute inset-y-0 end-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showToken ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? tc('saving') : tc('save')}
          </button>
        </form>
      </div>

      {/* Setup Guide Card (collapsible) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-start hover:bg-gray-50 transition-colors"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t('setupGuide')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('setupGuideDesc')}</p>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${guideOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {guideOpen && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <ol className="mt-4 space-y-4">
              {setupSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
              <strong>Tip:</strong> {t('setupTip')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
