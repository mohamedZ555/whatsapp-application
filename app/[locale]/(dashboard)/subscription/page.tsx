import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import prisma from '@/lib/prisma';
import { PLANS, USER_ROLES } from '@/lib/constants';
import { SubscriptionPlanCards } from './plan-cards';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

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

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const color = unlimited ? 'bg-emerald-400' : pct >= 90 ? 'bg-rose-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500 text-xs">
          {used} / {unlimited ? '∞' : limit === 0 ? '0' : limit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        {!unlimited && limit > 0 && (
          <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        )}
        {unlimited && <div className="h-2 rounded-full bg-emerald-400 w-1/3" />}
      </div>
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

  const vendorId = (session?.user as any)?.vendorId as string | undefined;

  // Fetch all data in parallel
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeSub, history, contactsCount, teamCount, botRepliesCount, botFlowsCount, campaignsCount] =
    await Promise.all([
      vendorId
        ? prisma.subscription.findFirst({ where: { vendorId, status: 'active' }, orderBy: { createdAt: 'desc' } })
        : null,
      vendorId
        ? prisma.subscription.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : [],
      vendorId ? prisma.contact.count({ where: { vendorId } }) : 0,
      vendorId
        ? prisma.user.count({ where: { vendorId, roleId: USER_ROLES.VENDOR_USER } })
        : 0,
      vendorId ? prisma.botReply.count({ where: { vendorId } }) : 0,
      vendorId ? prisma.botFlow.count({ where: { vendorId } }) : 0,
      vendorId
        ? prisma.campaign.count({ where: { vendorId, createdAt: { gte: monthStart } } })
        : 0,
    ]);

  const currentPlanId = ((activeSub?.planId ?? 'free') as keyof typeof PLANS);
  const currentPlan = PLANS[currentPlanId];
  const billingCycle = detectBillingCycle(activeSub?.startsAt ?? null, activeSub?.endsAt ?? null);
  const remaining = daysLeft(activeSub?.endsAt ?? null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

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
              {activeSub?.status === 'active' && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active
                </span>
              )}
              {activeSub?.endsAt && (
                <span>
                  Renews {new Date(activeSub.endsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {remaining !== null && remaining <= 7 && remaining > 0 && (
                <span className="rounded-full bg-amber-400/30 px-2 py-0.5 text-amber-200 text-xs font-semibold">
                  {remaining} days left
                </span>
              )}
              {remaining === 0 && (
                <span className="rounded-full bg-rose-400/30 px-2 py-0.5 text-rose-200 text-xs font-semibold">
                  Expires today
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
          </div>
        </div>
      </div>

      {/* Usage stats */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Current Usage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <UsageBar label="Contacts" used={contactsCount} limit={currentPlan.features.contacts} />
          <UsageBar label="Campaigns this month" used={campaignsCount} limit={currentPlan.features.campaignsPerMonth} />
          <UsageBar label="Bot Replies" used={botRepliesCount} limit={currentPlan.features.botReplies} />
          <UsageBar label="Bot Flows" used={botFlowsCount} limit={currentPlan.features.botFlows} />
          <UsageBar label="Team Members" used={teamCount} limit={currentPlan.features.teamMembers} />
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Available Plans</h3>
        <SubscriptionPlanCards
          currentPlanId={currentPlanId}
          currentBillingCycle={billingCycle}
          endsAt={activeSub?.endsAt?.toISOString() ?? null}
        />
      </div>

      {/* Subscription history */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Subscription History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3 text-start font-semibold">Plan</th>
                  <th className="px-6 py-3 text-start font-semibold">Billing</th>
                  <th className="px-6 py-3 text-start font-semibold">Status</th>
                  <th className="px-6 py-3 text-start font-semibold">Started</th>
                  <th className="px-6 py-3 text-start font-semibold">Ended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((sub) => {
                  const cycle = detectBillingCycle(sub.startsAt, sub.endsAt);
                  const planTitle = PLANS[sub.planId as keyof typeof PLANS]?.title ?? sub.planId;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-800">{planTitle}</td>
                      <td className="px-6 py-3 text-gray-500 capitalize">{cycle ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(sub.status)}`}>
                          {statusIcon(sub.status)}
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {sub.startsAt ? new Date(sub.startsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {sub.endsAt ? new Date(sub.endsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
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
