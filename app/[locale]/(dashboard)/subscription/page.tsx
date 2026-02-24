import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/prisma';
import { PLANS } from '@/lib/constants';
import { SubscriptionPlanCards } from './plan-cards';

function detectBillingCycle(startsAt: Date | null, endsAt: Date | null): 'monthly' | 'yearly' | null {
  if (!startsAt || !endsAt) return null;
  const days = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24);
  return days >= 300 ? 'yearly' : 'monthly';
}

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('subscription');

  const vendorId = (session?.user as any)?.vendorId as string | undefined;
  const subscription = vendorId
    ? await prisma.subscription.findFirst({
        where: { vendorId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  const currentPlanId = (subscription?.planId ?? 'free') as keyof typeof PLANS;
  const currentPlan = PLANS[currentPlanId];
  const billingCycle = detectBillingCycle(subscription?.startsAt ?? null, subscription?.endsAt ?? null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      {/* Current plan summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">{t('currentPlan')}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-3xl font-bold text-emerald-700">{currentPlan.title}</span>
            {billingCycle && (
              <span className="ml-2 text-sm text-gray-500 capitalize">{billingCycle}</span>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${subscription?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {subscription?.status ?? t('active')}
          </span>
          {subscription?.endsAt && (
            <span className="text-sm text-gray-500">
              Renews {new Date(subscription.endsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <SubscriptionPlanCards
        currentPlanId={currentPlanId}
        currentBillingCycle={billingCycle}
        endsAt={subscription?.endsAt?.toISOString() ?? null}
      />
    </div>
  );
}
