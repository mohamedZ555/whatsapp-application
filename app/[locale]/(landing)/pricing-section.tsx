'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { PlansMap } from '@/lib/plans';
import { useTranslations } from 'next-intl';

interface Props {
  plans: PlansMap;
}

const CheckIcon = () => (
  <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function PricingSection({ plans }: Props) {
  const t = useTranslations('landing');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const planList = Object.values(plans).filter((p) => p.enabled);

  const fmt = (val: number) => (val === -1 ? t('pricing.unlimited') : val.toLocaleString());

  return (
    <section id="pricing" className="bg-gray-50 px-6 py-20 scroll-mt-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">{t('pricing.title')}</h2>
          <p className="mt-2 text-gray-500 max-w-xl mx-auto">{t('pricing.subtitle')}</p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === 'monthly' ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billing === 'yearly' ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('pricing.yearly')}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${billing === 'yearly' ? 'bg-green-400 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {t('pricing.savePercent')}
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {planList.map((plan) => {
            const isPopular = plan.id === 'plan_2';
            const price = billing === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
            const isFreePlan = plan.pricing.monthly === 0;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-6 flex flex-col ${
                  isPopular
                    ? 'border-green-400 ring-2 ring-green-100 shadow-lg shadow-green-100/50'
                    : 'border-gray-200 shadow-sm'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-green-500 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                      {t('pricing.mostPopular')}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.title}</h3>
                  {plan.trialDays > 0 && (
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">
                      {t('pricing.trialDays', { days: plan.trialDays })}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {price === 0 ? t('pricing.free') : `$${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-gray-400 ms-1">
                      / {billing === 'yearly' ? t('pricing.perYear') : t('pricing.perMonth')}
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckIcon />
                    <span>{t('pricing.contacts')}: <strong>{fmt(plan.features.contacts)}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon />
                    <span>{t('pricing.botReplies')}: <strong>{fmt(plan.features.botReplies)}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon />
                    <span>{t('pricing.botFlowNodes')}: <strong>{fmt(plan.features.botFlowNodes ?? -1)}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.teamMembers !== 0 ? <CheckIcon /> : <XIcon />}
                    <span>{t('pricing.team')}: <strong>{plan.features.teamMembers === 0 ? '—' : fmt(plan.features.teamMembers)}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.aiChatBot ? <CheckIcon /> : <XIcon />}
                    <span className={plan.features.aiChatBot ? '' : 'text-gray-400'}>{t('pricing.aiChatBot')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.features.apiAccess ? <CheckIcon /> : <XIcon />}
                    <span className={plan.features.apiAccess ? '' : 'text-gray-400'}>{t('pricing.apiAccess')}</span>
                  </li>
                </ul>

                <Link
                  href="/register"
                  className={`block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                    isPopular
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : isFreePlan
                      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isFreePlan
                    ? t('pricing.getStartedFree')
                    : plan.trialDays > 0
                    ? t('pricing.startTrial')
                    : t('pricing.choosePlan')}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
