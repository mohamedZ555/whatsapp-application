"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { USER_ROLES } from "@/lib/constants";

// ─── Type Definitions ────────────────────────────────────────────────────────

interface Stats {
  totalContacts: number;
  totalMessages: number;
  activeCampaigns: number;
  planId: string;
  recentMessages: any[];
  deliveryStats: any[];
  // Super‑admin only
  totalVendors?: number;
  activeSubscriptions?: number;
  pendingVendors?: number;
  totalRevenue?: number;
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

// ─── Mini Components ──────────────────────────────────────────────────────────

function MiniUsageBar({ used, limit }: { used: number; limit: number }) {
  if (limit === -1)
    return (
      <div className="h-1.5 w-full rounded-full bg-emerald-400/20">
        <div className="h-1.5 rounded-full bg-emerald-400 w-1/3 animate-pulse" />
      </div>
    );
  if (limit === 0)
    return <div className="h-1.5 w-full rounded-full bg-slate-200" />;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color =
    pct >= 90 ? "bg-rose-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div
        className={`h-1.5 rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  colorClass,
  bgClass,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  href?: string;
}) {
  const card = (
    <div
      className={`relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm border border-gray-100 group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${href ? "cursor-pointer" : ""}`}
    >
      <div
        className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 ${bgClass}`}
      />
      <div className="flex items-start justify-between mb-3">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colorClass} ${bgClass} bg-opacity-15 shadow-sm`}
        >
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
    </div>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 animate-pulse shadow-sm border border-gray-100">
      <div className="w-10 h-10 rounded-xl bg-gray-200 mb-3" />
      <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3.5 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

// ─── Shared: Recent Messages List ─────────────────────────────────────────────

function RecentMessagesList({ messages }: { messages?: any[] }) {
  const t = useTranslations("dashboard");

  if (!messages || messages.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <div className="text-4xl mb-3">💬</div>
        <p className="text-gray-400 text-sm">{t("noMessagesYet")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {messages.map((msg: any) => (
        <div
          key={msg.id}
          className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
        >
          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-xs text-emerald-700 font-bold flex-shrink-0">
            {msg.contact?.firstName?.[0]?.toUpperCase() ?? "#"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {msg.contact?.firstName} {msg.contact?.lastName}
              <span className="text-gray-400 font-normal ml-1">
                ({msg.contact?.waId})
              </span>
            </p>
            <p className="text-xs text-gray-500 truncate">
              {msg.messageContent ?? `[${msg.messageType}]`}
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
              msg.isIncomingMessage
                ? "bg-blue-50 text-blue-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {msg.isIncomingMessage ? "↓" : "↑"} {msg.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Super‑Admin Dashboard ────────────────────────────────────────────────────

function SuperAdminDashboard({
  stats,
  loading,
}: {
  stats: Stats | null;
  loading: boolean;
}) {
  const t = useTranslations("dashboard");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-48 animate-pulse" />
      </div>
    );
  }

  const cards = [
    {
      label: t("totalVendors"),
      value: stats?.totalVendors ?? 0,
      icon: "🏢",
      colorClass: "text-violet-600",
      bgClass: "bg-violet-500",
      href: "/admin/vendors",
    },
    {
      label: t("activeSubscriptions"),
      value: stats?.activeSubscriptions ?? 0,
      icon: "💳",
      colorClass: "text-emerald-600",
      bgClass: "bg-emerald-500",
      href: "/admin/subscriptions",
    },
    {
      label: t("totalContacts"),
      value: stats?.totalContacts ?? 0,
      icon: "👥",
      colorClass: "text-blue-600",
      bgClass: "bg-blue-500",
    },
    {
      label: t("totalMessages"),
      value: stats?.totalMessages ?? 0,
      icon: "💬",
      colorClass: "text-indigo-600",
      bgClass: "bg-indigo-500",
    },
  ];

  const deliveryMap: Record<string, number> = {};
  stats?.deliveryStats?.forEach((d: any) => {
    deliveryMap[d.status] = d._count;
  });

  const pendingCount = stats?.pendingVendors ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {pendingCount > 0 && (
        <Link href="/admin/vendors">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 hover:bg-amber-100 transition cursor-pointer">
            <span className="text-amber-500 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {pendingCount > 1
                  ? t("vendorsAwaitingApprovalPlural", { count: pendingCount })
                  : t("vendorsAwaitingApproval", { count: pendingCount })}
              </p>
              <p className="text-xs text-amber-600">
                {t("clickToReviewAndApprove")}
              </p>
            </div>
            <span className="ml-auto text-amber-500 text-sm">→</span>
          </div>
        </Link>
      )}

      {stats?.deliveryStats && stats.deliveryStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              {t("platformMessageDelivery")}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("acrossAllWorkspaces")}
            </p>
          </div>
          <div className="px-6 py-4 flex flex-wrap gap-4">
            {Object.entries(deliveryMap).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2.5"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === "sent"
                      ? "bg-blue-400"
                      : status === "delivered"
                        ? "bg-emerald-400"
                        : status === "read"
                          ? "bg-purple-400"
                          : "bg-rose-400"
                  }`}
                />
                <span className="text-xs font-medium text-gray-600 capitalize">
                  {status}
                </span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              {t("recentMessages")}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("latestAcrossWorkspaces")}
            </p>
          </div>
          <Link
            href="/message-log"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            {t("viewAll")} →
          </Link>
        </div>
        <RecentMessagesList messages={stats?.recentMessages} />
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({
  stats,
  usage,
  loading,
}: {
  stats: Stats | null;
  usage: UsageData | null;
  loading: boolean;
}) {
  const t = useTranslations("dashboard");
  const tSub = useTranslations("subscription");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-48 animate-pulse" />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 animate-pulse" />
      </div>
    );
  }

  const planTitle = usage?.plan?.title ?? stats?.planId ?? "Free";

  const cards = [
    {
      label: t("totalContacts"),
      value: stats?.totalContacts ?? 0,
      icon: "👥",
      colorClass: "text-blue-600",
      bgClass: "bg-blue-500",
    },
    {
      label: t("totalMessages"),
      value: stats?.totalMessages ?? 0,
      icon: "💬",
      colorClass: "text-green-600",
      bgClass: "bg-green-500",
    },
    {
      label: t("activeCampaigns"),
      value: stats?.activeCampaigns ?? 0,
      icon: "📢",
      colorClass: "text-purple-600",
      bgClass: "bg-purple-500",
    },
    {
      label: t("currentPlan"),
      value: planTitle,
      icon: "💎",
      colorClass: "text-amber-600",
      bgClass: "bg-amber-500",
      href: "/subscription",
    },
  ];

  const dashboardItems =
    usage?.items?.filter((item) =>
      ["contacts", "botReplies", "botFlowNodes", "teamMembers"].includes(
        item.key,
      ),
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {usage && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">{t("planUsage")}</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {planTitle}
              </span>
              {usage.isExpired && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                  {t("expired")}
                </span>
              )}
              {usage.subscription?.endsAt && !usage.isExpired && (
                <span className="text-xs text-gray-400">
                  {t("renews")}{" "}
                  {new Date(usage.subscription.endsAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <Link
              href="/subscription"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              {t("managePlan")} →
            </Link>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {dashboardItems.map((item) => {
              const unlimited = item.limit === -1;
              const notAllowed = item.limit === 0;
              const pct =
                unlimited || notAllowed
                  ? null
                  : Math.min(100, Math.round((item.used / item.limit) * 100));
              const atLimit = pct !== null && pct >= 100;
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      {tSub(`usageLabel.${item.key}` as any, {
                        default: item.key,
                      })}
                    </span>
                    <span
                      className={
                        atLimit
                          ? "text-rose-500 font-semibold"
                          : "text-slate-400"
                      }
                    >
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
                    <p className="text-[10px] text-rose-500 font-medium">
                      {t("limitReached")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t("recentMessages")}</h2>
          <Link
            href="/message-log"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            {t("viewAll")} →
          </Link>
        </div>
        <RecentMessagesList messages={stats?.recentMessages} />
      </div>
    </div>
  );
}

// ─── Employee Dashboard ────────────────────────────────────────────────────────

function EmployeeDashboard({
  stats,
  loading,
}: {
  stats: Stats | null;
  loading: boolean;
}) {
  const t = useTranslations("dashboard");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 animate-pulse" />
      </div>
    );
  }

  // Employees see only operational stats — NO plan card, NO usage widget
  const cards = [
    {
      label: t("totalContacts"),
      value: stats?.totalContacts ?? 0,
      icon: "👥",
      colorClass: "text-blue-600",
      bgClass: "bg-blue-500",
    },
    {
      label: t("totalMessages"),
      value: stats?.totalMessages ?? 0,
      icon: "💬",
      colorClass: "text-green-600",
      bgClass: "bg-green-500",
    },
    {
      label: t("activeCampaigns"),
      value: stats?.activeCampaigns ?? 0,
      icon: "📢",
      colorClass: "text-purple-600",
      bgClass: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t("recentMessages")}</h2>
          <Link
            href="/message-log"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            {t("viewAll")} →
          </Link>
        </div>
        <RecentMessagesList messages={stats?.recentMessages} />
      </div>
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export default function DashboardClient({
  locale,
  roleId,
}: {
  locale: string;
  roleId: number;
}) {
  const isSuperAdmin = roleId === USER_ROLES.SUPER_ADMIN;
  const isEmployee = roleId === USER_ROLES.VENDOR_USER;

  const [stats, setStats] = useState<Stats | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requests: Promise<any>[] = [
      fetch("/api/dashboard/stats")
        .then((r) => r.json())
        .catch(() => null),
    ];

    // Only admins need usage data
    if (!isSuperAdmin && !isEmployee) {
      requests.push(
        fetch("/api/subscription/usage")
          .then((r) => r.json())
          .catch(() => null),
      );
    }

    Promise.all(requests).then(([s, u]) => {
      if (s && !s.error) setStats(s);
      if (u && !u.error) setUsage(u);
      setLoading(false);
    });
  }, [isSuperAdmin, isEmployee]);

  if (isSuperAdmin)
    return <SuperAdminDashboard stats={stats} loading={loading} />;
  if (isEmployee) return <EmployeeDashboard stats={stats} loading={loading} />;
  return <AdminDashboard stats={stats} usage={usage} loading={loading} />;
}
