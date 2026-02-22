import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/prisma';
import { PLANS } from '@/lib/constants';

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('subscription');
  const tc = await getTranslations('common');

  const vendorId = (session?.user as any)?.vendorId;
  const subscription = vendorId
    ? await prisma.subscription.findFirst({ where: { vendorId, status: 'active' }, orderBy: { createdAt: 'desc' } })
    : null;

  const currentPlanId = (subscription?.planId ?? 'free') as keyof typeof PLANS;
  const currentPlan = PLANS[currentPlanId];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">{t('currentPlan')}</h2>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-3xl font-bold text-green-600">{currentPlan.title}</span>
          <span className={`px-3 py-1 rounded-full text-sm ${subscription?.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {subscription?.status ?? t('active')}
          </span>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(PLANS).map((plan) => (
          <div key={plan.id} className={`bg-white rounded-xl border p-6 shadow-sm ${plan.id === currentPlanId ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-100'}`}>
            <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.title}</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${plan.pricing.monthly}
              <span className="text-sm font-normal text-gray-500">{t('perMonth')}</span>
            </p>
            {plan.id !== currentPlanId && (
              <button className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                {t('upgradePlan')}
              </button>
            )}
            {plan.id === currentPlanId && (
              <div className="w-full mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm text-center font-medium">
                ✓ {t('currentPlan')}
              </div>
            )}
            <ul className="mt-4 space-y-2 text-xs text-gray-600">
              <li>👥 {plan.features.contacts === -1 ? t('unlimited') : plan.features.contacts} {t('contacts')}</li>
              <li>📢 {plan.features.campaignsPerMonth === -1 ? t('unlimited') : plan.features.campaignsPerMonth} {t('campaigns')}</li>
              <li>🤖 {plan.features.botReplies === -1 ? t('unlimited') : plan.features.botReplies} {t('botReplies')}</li>
              <li>👤 {plan.features.teamMembers === 0 ? tc('no') : plan.features.teamMembers === -1 ? t('unlimited') : plan.features.teamMembers} {t('teamMembers')}</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
