'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface Stats {
  totalContacts: number;
  totalMessages: number;
  activeCampaigns: number;
  planId: string;
  recentMessages: any[];
  deliveryStats: any[];
}

interface UsageItem {
  key: string;
  label: string;
  used: number;
  limit: number;
}

interface UsageData {
  planId: string;
  plan: { title: string; pricing: { monthly: number; yearly: number } };
  subscription: { status: string; endsAt: string | null } | null;
  isExpired: boolean;
  items: UsageItem[];
}

function MiniUsageBar({ used, limit }: { used: number; limit: number }) {
  if (limit === -1) return <div className="h-1.5 w-full rounded-full bg-emerald-400/30"><div className="h-1.5 rounded-full bg-emerald-400 w-1/3" /></div>;
  if (limit === 0) return <div className="h-1.5 w-full rounded-full bg-slate-200" />;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 90 ? 'bg-rose-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function DashboardClient({ locale }: { locale: string }) {
  const t = useTranslations('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then((r) => r.json()).catch(() => null),
      fetch('/api/subscription/usage').then((r) => r.json()).catch(() => null),
    ]).then(([s, u]) => {
      if (s && !s.error) setStats(s);
      if (u && !u.error) setUsage(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const planTitle = usage?.plan?.title ?? stats?.planId ?? 'Free';

  const statCards = [
    { label: t('totalContacts'), value: stats?.totalContacts ?? 0, icon: '👥', color: 'bg-blue-50 text-blue-600' },
    { label: t('totalMessages'), value: stats?.totalMessages ?? 0, icon: '💬', color: 'bg-green-50 text-green-600' },
    { label: t('activeCampaigns'), value: stats?.activeCampaigns ?? 0, icon: '📢', color: 'bg-purple-50 text-purple-600' },
    { label: t('currentPlan'), value: planTitle, icon: '💎', color: 'bg-yellow-50 text-yellow-600' },
  ];

  // Limit the usage items shown on dashboard to the most important ones
  const dashboardItems = usage?.items?.filter((item) =>
    ['contacts', 'campaignsPerMonth', 'botReplies', 'teamMembers'].includes(item.key)
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${card.color}`}>
                {card.icon}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Plan usage mini widget */}
      {usage && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Plan Usage</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {planTitle}
              </span>
              {usage.isExpired && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                  Expired
                </span>
              )}
            </div>
            <Link
              href="/subscription"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Manage plan →
            </Link>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardItems.map((item) => {
              const unlimited = item.limit === -1;
              const notAllowed = item.limit === 0;
              const pct = unlimited || notAllowed ? null : Math.min(100, Math.round((item.used / item.limit) * 100));
              const atLimit = pct !== null && pct >= 100;
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <span className={atLimit ? 'text-rose-500 font-semibold' : 'text-slate-400'}>
                      {notAllowed ? (
                        <span className="text-slate-300">—</span>
                      ) : unlimited ? (
                        `${item.used} / ∞`
                      ) : (
                        `${item.used} / ${item.limit}`
                      )}
                    </span>
                  </div>
                  <MiniUsageBar used={item.used} limit={item.limit} />
                  {atLimit && (
                    <p className="text-[10px] text-rose-500 font-medium">Limit reached</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t('recentMessages')}</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {stats?.recentMessages?.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">{t('noMessagesYet')}</div>
          )}
          {stats?.recentMessages?.map((msg: any) => (
            <div key={msg.id} className="px-6 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-600 font-medium">
                {msg.contact?.firstName?.[0]?.toUpperCase() ?? '#'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {msg.contact?.firstName} {msg.contact?.lastName} ({msg.contact?.waId})
                </p>
                <p className="text-xs text-gray-500 truncate">{msg.messageContent ?? `[${msg.messageType}]`}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  msg.isIncomingMessage ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                }`}
              >
                {msg.isIncomingMessage ? '↓' : '↑'} {msg.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
