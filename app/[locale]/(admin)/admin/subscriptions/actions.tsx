'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { PLANS } from '@/lib/constants';

const AVAILABLE_PLANS = Object.keys(PLANS) as Array<keyof typeof PLANS>;

type Props = {
  vendorId: string;
  vendorTitle: string;
  currentPlanId: string;
};

export function AdminSubscriptionActions({ vendorId, vendorTitle, currentPlanId }: Props) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(currentPlanId);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  async function handleChangePlan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, planId: selectedPlan, billingCycle }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        router.refresh();
      } else {
        alert(data.error ?? tCommon('error'));
      }
    } catch {
      alert(tCommon('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
      >
        {tAdmin('changePlan')}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {tAdmin('changePlan')} — {vendorTitle}
            </h2>
            <form onSubmit={handleChangePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('plan')}</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {AVAILABLE_PLANS.map((p) => (
                    <option key={p} value={p}>
                      {PLANS[p].title} (${PLANS[p].pricing.monthly}/mo)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tAdmin('billingCycle')}</label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="monthly">{tAdmin('monthly')}</option>
                  <option value="yearly">{tAdmin('yearly')}</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? tCommon('saving') : tAdmin('applyPlan')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {tCommon('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
