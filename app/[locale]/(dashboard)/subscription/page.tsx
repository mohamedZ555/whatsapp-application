import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { getServerPlans } from '@/lib/plans';
import { getVendorUsage } from '@/lib/permissions';
import { USER_ROLES } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { SubscriptionPlanCards } from './plan-cards';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

function detectBillingCycle(startsAt: Date | null, endsAt: Date | null): 'monthly' | 'yearly' | null {
  if (!startsAt || !endsAt) return null;
  const days = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24);
  return days >= 300 ? 'yearly' : 'monthly';
}

function daysLeft(endsAt: Date | null): number | null {
  if (!endsAt) return null;
  const diff = endsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = limit === -1;
  const notAllowed = limit === 0;
  const pct = unlimited || notAllowed ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const color =
    notAllowed
      ? 'bg-slate-300'
      : unlimited
      ? 'bg-emerald-400'
      : pct >= 90
      ? 'bg-rose-400'
      : pct >= 70
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500 text-xs">
          {notAllowed ? (
            <span className="text-rose-500 font-semibold">Not included</span>
          ) : (
            <>
              {used} / {unlimited ? '∞' : limit}
              {!unlimited && limit > 0 && (
                <span className="ml-1 text-slate-400">({pct}%)</span>
              )}
            </>
          )}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        {!unlimited && !notAllowed && limit > 0 && (
          <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        )}
        {unlimited && <div className="h-2 rounded-full bg-emerald-400 w-1/3" />}
        {notAllowed && <div className="h-2 rounded-full bg-slate-300 w-full" />}
      </div>
      {!unlimited && !notAllowed && limit > 0 && pct >= 90 && (
        <p className="mt-0.5 text-[11px] text-rose-500 font-medium">
          {pct >= 100 ? 'Limit reached — upgrade to add more' : `${limit - used} remaining`}
        </p>
      )}
    </div>
  );
}

function statusIcon(status: string) {
  if (status === 'active') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'cancelled') return <XCircle className="h-4 w-4 text-rose-400" />;
  return <Clock className="h-4 w-4 text-slate-400" />;
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-rose-100 text-rose-600',
    pending: 'bg-amber-100 text-amber-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-500';
}

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('subscription');
  const tr = (en: string, ar: string) => (t('title') === 'الاشتراك' ? ar : en);

  const user = session?.user as any;
  const vendorId = user?.vendorId as string | undefined;
  const roleId = user?.roleId as number | undefined;

  if (!vendorId || roleId === USER_ROLES.SUPER_ADMIN) {
    return (
        <div className="flex items-center justify-center h-64 text-slate-500">
        {tr('No vendor context available.', 'لا يتوفر سياق بائع.')}
      </div>
    );
  }

  const [usageResult, plans, history] = await Promise.all([
    getVendorUsage(vendorId),
    getServerPlans(),
    prisma_history(vendorId),
  ]);

  const { plan: currentPlan, planId: currentPlanId, subscription: activeSub, isExpired, items } = usageResult;
  const billingCycle = activeSub
    ? detectBillingCycle(activeSub.startsAt, activeSub.endsAt)
    : null;
  const remaining = activeSub ? daysLeft(activeSub.endsAt) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

      {/* Expired / no active plan warning */}
      {isExpired && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">{tr('Your plan has expired', 'انتهت صلاحية خطتك')}</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {tr('You are currently on the', 'أنت حاليًا على حدود خطة')} <strong>{t('free')}</strong> {tr('tier limits. Upgrade below to restore full access.', 'قم بالترقية أدناه لاستعادة الوصول الكامل.')}
            </p>
          </div>
        </div>
      )}

      {/* Current plan hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-6 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 right-12 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-200">{t('currentPlan')}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <h2 className="text-4xl font-bold">{currentPlan.title}</h2>
              {billingCycle && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold capitalize">
                  {billingCycle}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-emerald-100">
              {activeSub?.status === 'active' && !isExpired && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('active')}
                </span>
              )}
              {activeSub?.endsAt && !isExpired && (
                <span>
                  {tr('Renews', 'يتجدد')}{' '}
                  {new Date(activeSub.endsAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
              {remaining !== null && remaining <= 7 && remaining > 0 && (
                <span className="rounded-full bg-amber-400/30 px-2 py-0.5 text-amber-200 text-xs font-semibold">
                  {tr(`${remaining} days left`, `متبقي ${remaining} يوم`)}
                </span>
              )}
              {remaining === 0 && (
                <span className="rounded-full bg-rose-400/30 px-2 py-0.5 text-rose-200 text-xs font-semibold">
                  {tr('Expires today', 'تنتهي اليوم')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">
              ${billingCycle === 'yearly' ? currentPlan.pricing.yearly : currentPlan.pricing.monthly}
              <span className="text-base font-normal text-emerald-200">
                {billingCycle === 'yearly' ? '/yr' : '/mo'}
              </span>
            </p>
            {billingCycle === 'yearly' && currentPlan.pricing.monthly > 0 && (
              <p className="text-xs text-emerald-300 mt-0.5">
                vs ${currentPlan.pricing.monthly * 12}/yr monthly
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Usage stats */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">{tr('Current Usage', 'الاستخدام الحالي')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {items.map((item) => (
            <UsageBar key={item.key} label={item.label} used={item.used} limit={item.limit} />
          ))}
        </div>

        {/* Feature flags row */}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
          <FeaturePill label="AI Chat Bot" enabled={currentPlan.features.aiChatBot} />
          <FeaturePill label="API Access" enabled={currentPlan.features.apiAccess} />
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">{tr('Available Plans', 'الخطط المتاحة')}</h3>
        <SubscriptionPlanCards
          currentPlanId={currentPlanId}
          currentBillingCycle={billingCycle}
          endsAt={activeSub?.endsAt ? new Date(activeSub.endsAt).toISOString() : null}
          plans={plans}
        />
      </div>

      {/* Subscription history */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{tr('Subscription History', 'سجل الاشتراكات')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3 text-start font-semibold">{tr('Plan', 'الخطة')}</th>
                  <th className="px-6 py-3 text-start font-semibold">{tr('Billing', 'الفوترة')}</th>
                  <th className="px-6 py-3 text-start font-semibold">{tr('Status', 'الحالة')}</th>
                  <th className="px-6 py-3 text-start font-semibold">{tr('Started', 'بدأت')}</th>
                  <th className="px-6 py-3 text-start font-semibold">{tr('Ended', 'انتهت')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((sub) => {
                  const cycle = detectBillingCycle(sub.startsAt, sub.endsAt);
                  const planTitle = plans[sub.planId]?.title ?? sub.planId;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-800">{planTitle}</td>
                      <td className="px-6 py-3 text-gray-500 capitalize">{cycle ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(sub.status)}`}
                        >
                          {statusIcon(sub.status)}
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {sub.startsAt
                          ? new Date(sub.startsAt).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {sub.endsAt
                          ? new Date(sub.endsAt).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        enabled
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-400 line-through'
      }`}
    >
      {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

async function prisma_history(vendorId: string) {
  return prisma.subscription.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}
