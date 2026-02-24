'use client';

import { useState } from 'react';
import { PLANS } from '@/lib/constants';

type TData = {
  currentPlan: string;
  perMonth: string;
  upgradePlan: string;
  unlimited: string;
  contacts: string;
  campaigns: string;
  botReplies: string;
  teamMembers: string;
  no: string;
};

type Props = {
  currentPlanId: string;
  tData: TData;
};

export function SubscriptionPlanCards({ currentPlanId, tData }: Props) {
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
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Successfully upgraded to ${PLANS[planId as keyof typeof PLANS]?.title ?? planId}!` });
        // Reload to reflect new plan
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setFeedback({ type: 'error', message: data.error ?? 'Failed to upgrade plan.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setUpgrading(null);
    }
  }

  const featureCount = (val: number, singular: string) =>
    val === -1 ? `${tData.unlimited} ${singular}` : `${val} ${singular}`;

  return (
    <div>
      {feedback && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(PLANS).map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border p-6 shadow-sm ${
              plan.id === currentPlanId ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-100'
            }`}
          >
            <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.title}</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${plan.pricing.monthly}
              <span className="text-sm font-normal text-gray-500">{tData.perMonth}</span>
            </p>

            {plan.id !== currentPlanId ? (
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={upgrading === plan.id}
                className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {upgrading === plan.id ? '...' : tData.upgradePlan}
              </button>
            ) : (
              <div className="w-full mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm text-center font-medium">
                ✓ {tData.currentPlan}
              </div>
            )}

            <ul className="mt-4 space-y-2 text-xs text-gray-600">
              <li>👥 {featureCount(plan.features.contacts, tData.contacts)}</li>
              <li>📢 {featureCount(plan.features.campaignsPerMonth, tData.campaigns)}</li>
              <li>🤖 {featureCount(plan.features.botReplies, tData.botReplies)}</li>
              <li>
                👤 {plan.features.teamMembers === 0
                  ? tData.no
                  : featureCount(plan.features.teamMembers, tData.teamMembers)}
              </li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
