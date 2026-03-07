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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  if (!messages || messages.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <div className="text-4xl mb-3">💬</div>
        <p className="text-gray-400 text-sm">{t("noMessagesYet")}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(messages.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentMessages = messages.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-gray-50 flex-1">
        {currentMessages.map((msg: any) => (
          <div
            key={msg.id}
            className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${msg.isIncomingMessage ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}
            >
              {msg.contact?.firstName?.[0]?.toUpperCase() ?? "#"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                {msg.contact?.firstName} {msg.contact?.lastName}
                <span className="text-gray-400 font-normal text-xs">
                  ({msg.contact?.waId})
                </span>
              </p>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {msg.messageContent ?? `[${msg.messageType}]`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                  msg.isIncomingMessage
                    ? "bg-blue-50 text-blue-600"
                    : msg.status === "failed"
                      ? "bg-rose-50 text-rose-600"
                      : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {msg.isIncomingMessage ? "↓ IN" : "↑ " + msg.status}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-b-2xl">
          <span className="text-xs text-gray-500 font-medium">
            Showing {startIdx + 1}-
            {Math.min(startIdx + itemsPerPage, messages.length)} of{" "}
            {messages.length}
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Prev
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared: Delivery Stats ───────────────────────────────────────────────────

function MessageDeliveryStats({
  stats,
  isSuperAdmin,
}: {
  stats: Stats | null;
  isSuperAdmin?: boolean;
}) {
  const t = useTranslations("dashboard");

  if (!stats?.deliveryStats || stats.deliveryStats.length === 0) return null;

  const deliveryMap: Record<string, number> = {};
  stats.deliveryStats.forEach((d: any) => {
    deliveryMap[d.status] = d._count;
  });

  const totalOutbound = Object.values(deliveryMap).reduce(
    (acc, curr) => acc + curr,
    0,
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">
            {isSuperAdmin
              ? t("platformMessageDelivery")
              : t("localMessageDelivery")}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isSuperAdmin
              ? t("acrossAllWorkspaces")
              : t("localMessageDeliveryDesc")}
          </p>
        </div>
        <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-center">
          <p className="text-xs text-slate-500 font-medium">Total Tracked</p>
          <p className="text-sm font-bold text-slate-800 tabular-nums">
            {totalOutbound}
          </p>
        </div>
      </div>
      <div className="px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["sent", "delivered", "read", "failed"].map((status) => {
          const count = deliveryMap[status] || 0;
          const percent =
            totalOutbound > 0 ? Math.round((count / totalOutbound) * 100) : 0;

          let colorClass = "bg-slate-400",
            bgLighter = "bg-slate-50";
          if (status === "sent") {
            colorClass = "bg-blue-400";
            bgLighter = "bg-blue-50";
          }
          if (status === "delivered") {
            colorClass = "bg-emerald-400";
            bgLighter = "bg-emerald-50";
          }
          if (status === "read") {
            colorClass = "bg-purple-400";
            bgLighter = "bg-purple-50";
          }
          if (status === "failed") {
            colorClass = "bg-rose-400";
            bgLighter = "bg-rose-50";
          }

          return (
            <div
              key={status}
              className={`p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group`}
            >
              <div
                className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${colorClass}`}
                style={{ width: `${percent}%` }}
              />
              <div
                className={`absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-10 transition-opacity ${bgLighter} ${colorClass.replace("bg-", "bg-")}`}
              />
              <div className="mb-1 text-2xl font-bold text-gray-900 tabular-nums z-10">
                {count}
              </div>
              <div className="flex items-center gap-1.5 z-10">
                <span className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />
                <span className="text-xs font-semibold text-gray-500 capitalize">
                  {t(status as any, { default: status })}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 z-10">
                {percent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin/Employee Quick Actions ──────────────────────────────────────────────

function ActionQuickLinks() {
  const t = useTranslations("dashboard");
  const tn = useTranslations("nav");
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">{t("quickActions")}</h2>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/campaigns"
          className="px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition border border-emerald-100/50 flex items-center gap-2"
        >
          {t("createCampaign")}
        </Link>
        <Link
          href="/contacts"
          className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition border border-blue-100/50 flex items-center gap-2"
        >
          {t("addContact")}
        </Link>
        <Link
          href="/bot-replies"
          className="px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-100 transition border border-purple-100/50 flex items-center gap-2"
        >
          {t("setupBot")}
        </Link>
        <Link
          href="/templates"
          className="px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition border border-amber-100/50 flex items-center gap-2"
        >
          {t("syncTemplates")}
        </Link>
        <Link
          href="/users"
          className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition border border-indigo-100/50 flex items-center gap-2"
        >
          {t("manageTeam")}
        </Link>
        <Link
          href="/chat"
          className="px-4 py-2.5 bg-cyan-50 text-cyan-700 rounded-xl text-sm font-semibold hover:bg-cyan-100 transition border border-cyan-100/50 flex items-center gap-2"
        >
          {t("chatInbox")}
        </Link>
        <Link
          href="/settings"
          className="px-4 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition border border-slate-100/50 flex items-center gap-2"
        >
          {tn("settings")}
        </Link>
      </div>
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

      <MessageDeliveryStats stats={stats} isSuperAdmin />

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

      <ActionQuickLinks />

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

      <MessageDeliveryStats stats={stats} />

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

      <ActionQuickLinks />

      <MessageDeliveryStats stats={stats} />

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
