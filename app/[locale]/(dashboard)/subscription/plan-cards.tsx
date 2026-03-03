'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { PlansMap } from '@/lib/plans';

type Props = {
  currentPlanId: string;
  currentBillingCycle: 'monthly' | 'yearly' | null;
  endsAt: string | null;
  plans: PlansMap;
};

export function SubscriptionPlanCards({ currentPlanId, currentBillingCycle, endsAt, plans }: Props) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const tr = (en: string, ar: string) => (isArabic ? ar : en);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(currentBillingCycle ?? 'monthly');
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleUpgrade(planId: string) {
    if (upgrading) return;
    setUpgrading(planId);
    setFeedback(null);
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: isArabic ? `تم تغيير الخطة إلى ${plans[planId]?.title ?? planId}!` : `Plan changed to ${plans[planId]?.title ?? planId}!` });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setFeedback({ type: 'error', message: data.error ?? 'Failed to change plan.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setUpgrading(null);
    }
  }

  const featureVal = (val: number, singular: string) =>
    val === -1 ? `Unlimited ${singular}` : val === 0 ? `No ${singular}` : `${val} ${singular}`;

  const sortedPlans = Object.values(plans).sort(
    (a, b) => a.pricing.monthly - b.pricing.monthly
  );

  return (
    <div>
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white shadow-sm text-emerald-700 border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white shadow-sm text-emerald-700 border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Yearly
            <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Save ~17%
            </span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedPlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const price = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
          const perLabel = billingCycle === 'yearly' ? '/ year' : '/ month';

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border p-6 shadow-sm flex flex-col ${
                isCurrent ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-100'
              }`}
            >
              {isCurrent && (
                <div className="mb-2 inline-flex self-start rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              {tr('Current Plan', 'الخطة الحالية')}
                </div>
              )}
              <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-0.5">
                ${price}
                <span className="text-sm font-normal text-gray-400 ml-1">{perLabel}</span>
              </p>
              {billingCycle === 'yearly' && plan.pricing.monthly > 0 && (
                <p className="text-xs text-gray-400 mb-1 line-through">${plan.pricing.monthly * 12} / year</p>
              )}

              <ul className="mt-3 space-y-1.5 text-xs text-gray-500 flex-1">
                <li>✓ {featureVal(plan.features.contacts, 'contacts')}</li>
                <li>✓ {featureVal(plan.features.campaignsPerMonth, 'campaigns/mo')}</li>
                <li>✓ {featureVal(plan.features.botReplies, 'bot replies')}</li>
                <li>✓ {featureVal(plan.features.botFlows, 'bot flows')}</li>
                <li>✓ {featureVal(plan.features.teamMembers, 'team members')}</li>
                <li>✓ {featureVal(plan.features.contactCustomFields, 'custom fields')}</li>
                <li className={plan.features.aiChatBot ? 'text-gray-500' : 'text-gray-300 line-through'}>
                  {plan.features.aiChatBot ? '✓' : '✗'} AI Chat Bot
                </li>
                <li className={plan.features.apiAccess ? 'text-gray-500' : 'text-gray-300 line-through'}>
                  {plan.features.apiAccess ? '✓' : '✗'} API Access
                </li>
              </ul>

              <div className="mt-4">
                {isCurrent ? (
                  <div className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm text-center font-medium">
                    ✓ Active
                    {endsAt && (
                      <div className="text-[10px] text-emerald-500 mt-0.5">
                        Renews {new Date(endsAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading === plan.id}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {upgrading === plan.id
                      ? tr('Upgrading...', 'جارٍ الترقية...')
                      : plan.pricing.monthly === 0
                      ? tr('Switch to Free', 'التحويل إلى المجانية')
                      : tr('Upgrade', 'ترقية')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
