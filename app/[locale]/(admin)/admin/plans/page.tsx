'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

type PlanFeatures = {
  contacts: number;
  campaignsPerMonth: number;
  botReplies: number;
  botFlows: number;
  contactCustomFields: number;
  teamMembers: number;
  aiChatBot: boolean;
  apiAccess: boolean;
};

type PlanConfig = {
  id: string;
  title: string;
  enabled: boolean;
  features: PlanFeatures;
  pricing: { monthly: number; yearly: number };
  trialDays: number;
  stripePriceIds: { monthly: string | null; yearly: string | null };
};

type PlansMap = Record<string, PlanConfig>;

function featureDisplay(val: number) {
  if (val === -1) return '∞';
  return String(val);
}

function EditPlanModal({
  plan,
  onClose,
  onSave,
}: {
  plan: PlanConfig;
  onClose: () => void;
  onSave: (updated: PlanConfig) => void;
}) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [draft, setDraft] = useState<PlanConfig>(JSON.parse(JSON.stringify(plan)));

  function setField<K extends keyof PlanConfig>(key: K, value: PlanConfig[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function setFeature<K extends keyof PlanFeatures>(key: K, value: PlanFeatures[K]) {
    setDraft((d) => ({ ...d, features: { ...d.features, [key]: value } }));
  }
  function setPricing(field: 'monthly' | 'yearly', value: number) {
    setDraft((d) => ({ ...d, pricing: { ...d.pricing, [field]: value } }));
  }
  function setStripe(field: 'monthly' | 'yearly', value: string) {
    setDraft((d) => ({ ...d, stripePriceIds: { ...d.stripePriceIds, [field]: value || null } }));
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 my-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{tAdmin('editPlan')} — {plan.title}</h2>
        <div className="space-y-4">
          {/* Basic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{tAdmin('titleColumn')}</label>
              <input
                value={draft.title}
                onChange={(e) => setField('title', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{tAdmin('trialDays')}</label>
              <input
                type="number"
                min={0}
                value={draft.trialDays}
                onChange={(e) => setField('trialDays', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="plan-enabled"
              checked={draft.enabled}
              onChange={(e) => setField('enabled', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            <label htmlFor="plan-enabled" className="text-sm text-gray-700">{tAdmin('enabledVisibleToVendors')}</label>
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{tAdmin('pricingUSD')}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{tAdmin('monthly')} ($)</label>
                <input
                  type="number"
                  min={0}
                  value={draft.pricing.monthly}
                  onChange={(e) => setPricing('monthly', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{tAdmin('yearly')} ($)</label>
                <input
                  type="number"
                  min={0}
                  value={draft.pricing.yearly}
                  onChange={(e) => setPricing('yearly', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Feature Limits */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{tAdmin('featureLimits')}</label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { key: 'contacts', labelKey: 'contacts' },
                  { key: 'campaignsPerMonth', labelKey: 'campaignsPerMonth' },
                  { key: 'botReplies', labelKey: 'botReplies' },
                  { key: 'botFlows', labelKey: 'botFlows' },
                  { key: 'contactCustomFields', labelKey: 'customFields' },
                  { key: 'teamMembers', labelKey: 'teamMembers' },
                ] as const
              ).map(({ key, labelKey }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{tAdmin(labelKey)}</label>
                  <input
                    type="number"
                    min={-1}
                    value={draft.features[key] as number}
                    onChange={(e) => setFeature(key, Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.features.aiChatBot}
                  onChange={(e) => setFeature('aiChatBot', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                {tAdmin('aiChatbot')}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.features.apiAccess}
                  onChange={(e) => setFeature('apiAccess', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                {tAdmin('apiAccess')}
              </label>
            </div>
          </div>

          {/* Stripe Price IDs */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{tAdmin('stripePriceIdsOptional')}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{tAdmin('monthlyPriceId')}</label>
                <input
                  value={draft.stripePriceIds.monthly ?? ''}
                  onChange={(e) => setStripe('monthly', e.target.value)}
                  placeholder="price_xxxx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{tAdmin('yearlyPriceId')}</label>
                <input
                  value={draft.stripePriceIds.yearly ?? ''}
                  onChange={(e) => setStripe('yearly', e.target.value)}
                  placeholder="price_xxxx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onSave(draft)}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {tAdmin('savePlan')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminPlansPage() {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [plans, setPlans] = useState<PlansMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editPlan, setEditPlan] = useState<PlanConfig | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      setPlans(data.plans ?? {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function savePlans(updated: PlansMap) {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: updated }),
      });
      const data = await res.json();
      if (data.success) {
        setPlans(updated);
        setFeedback({ type: 'success', msg: tAdmin('plansSaved') });
      } else {
        setFeedback({ type: 'error', msg: data.error ?? tCommon('error') });
      }
    } catch {
      setFeedback({ type: 'error', msg: tCommon('error') });
    } finally {
      setSaving(false);
    }
  }

  function handleSavePlan(updated: PlanConfig) {
    const newPlans = { ...plans, [updated.id]: updated };
    setEditPlan(null);
    savePlans(newPlans);
  }

  async function handleReset() {
    if (!confirm(tAdmin('resetToDefaults') + '?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: {} }),
      });
      const data = await res.json();
      if (data.success) { await load(); setFeedback({ type: 'success', msg: tAdmin('plansReset') }); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-[40px] font-normal leading-none tracking-tight text-emerald-950">{tAdmin('plans')}</h1>
          <p className="mt-1 text-sm text-slate-500">{tAdmin('plansSubtitle')}</p>
        </div>
        <button
          onClick={handleReset}
          disabled={saving}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {tAdmin('resetToDefaults')}
        </button>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${feedback.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
          {feedback.msg}
        </div>
      )}

      {loading ? (
        <div className="rounded-md border border-emerald-100 bg-white p-10 text-center text-sm text-slate-400">{tAdmin('loadingPlans')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Object.values(plans).map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm flex flex-col gap-3 ${plan.enabled ? 'border-emerald-100' : 'border-dashed border-gray-300 opacity-70'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.title}</h3>
                  <p className="text-xs text-gray-400">{plan.id}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {plan.enabled ? tCommon('enabled') : tCommon('disabled')}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{tAdmin('monthly')}</span>
                  <span className="font-semibold text-gray-800">${plan.pricing.monthly}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{tAdmin('yearly')}</span>
                  <span className="font-semibold text-gray-800">${plan.pricing.yearly}</span>
                </div>
                {plan.trialDays > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{tAdmin('trialDays')}</span>
                    <span className="font-semibold text-gray-800">{plan.trialDays}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between"><span>{tAdmin('contacts')}</span><span className="font-medium text-gray-700">{featureDisplay(plan.features.contacts)}</span></div>
                <div className="flex justify-between"><span>{tAdmin('campaignsPerMonth')}</span><span className="font-medium text-gray-700">{featureDisplay(plan.features.campaignsPerMonth)}</span></div>
                <div className="flex justify-between"><span>{tAdmin('botReplies')}</span><span className="font-medium text-gray-700">{featureDisplay(plan.features.botReplies)}</span></div>
                <div className="flex justify-between"><span>{tAdmin('botFlows')}</span><span className="font-medium text-gray-700">{featureDisplay(plan.features.botFlows)}</span></div>
                <div className="flex justify-between"><span>{tAdmin('teamMembers')}</span><span className="font-medium text-gray-700">{plan.features.teamMembers === 0 ? tAdmin('noneLabel') : featureDisplay(plan.features.teamMembers)}</span></div>
                <div className="flex justify-between"><span>{tAdmin('aiChatbot')}</span><span className={plan.features.aiChatBot ? 'text-emerald-600 font-medium' : 'text-gray-400'}>{plan.features.aiChatBot ? tCommon('yes') : tCommon('no')}</span></div>
                <div className="flex justify-between"><span>{tAdmin('apiAccess')}</span><span className={plan.features.apiAccess ? 'text-emerald-600 font-medium' : 'text-gray-400'}>{plan.features.apiAccess ? tCommon('yes') : tCommon('no')}</span></div>
              </div>

              <button
                onClick={() => setEditPlan(plan)}
                disabled={saving}
                className="mt-auto rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                {tAdmin('editPlan')}
              </button>
            </div>
          ))}
        </div>
      )}

      {mounted && editPlan && (
        <EditPlanModal
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSave={handleSavePlan}
        />
      )}
    </div>
  );
}
