import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/prisma';
import { PLANS } from '@/lib/constants';
import { SubscriptionPlanCards } from './plan-cards';

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

  const tData = {
    title: t('title'),
    currentPlan: t('currentPlan'),
    active: t('active'),
    perMonth: t('perMonth'),
    upgradePlan: t('upgradePlan'),
    unlimited: t('unlimited'),
    contacts: t('contacts'),
    campaigns: t('campaigns'),
    botReplies: t('botReplies'),
    teamMembers: t('teamMembers'),
    no: tc('no'),
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{tData.title}</h1>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">{tData.currentPlan}</h2>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-3xl font-bold text-green-600">{currentPlan.title}</span>
          <span className={`px-3 py-1 rounded-full text-sm ${subscription?.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {subscription?.status ?? tData.active}
          </span>
        </div>
      </div>

      {/* Plan Cards - Client Component for interactive upgrade */}
      <SubscriptionPlanCards
        currentPlanId={currentPlanId}
        tData={tData}
      />
    </div>
  );
}
