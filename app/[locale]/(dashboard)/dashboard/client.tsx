'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Stats {
  totalContacts: number;
  totalMessages: number;
  activeCampaigns: number;
  planId: string;
  recentMessages: any[];
  deliveryStats: any[];
}

export default function DashboardClient({ locale }: { locale: string }) {
  const t = useTranslations('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
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

  const statCards = [
    { label: t('totalContacts'), value: stats?.totalContacts ?? 0, icon: '👥', color: 'bg-blue-50 text-blue-600' },
    { label: t('totalMessages'), value: stats?.totalMessages ?? 0, icon: '💬', color: 'bg-green-50 text-green-600' },
    { label: t('activeCampaigns'), value: stats?.activeCampaigns ?? 0, icon: '📢', color: 'bg-purple-50 text-purple-600' },
    { label: t('currentPlan'), value: stats?.planId ?? 'free', icon: '💎', color: 'bg-yellow-50 text-yellow-600' },
  ];

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

      {/* Recent Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t('recentMessages')}</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {stats?.recentMessages?.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No messages yet.</div>
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
              <span className={`text-xs px-2 py-0.5 rounded-full ${msg.isIncomingMessage ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                {msg.isIncomingMessage ? '↓' : '↑'} {msg.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
