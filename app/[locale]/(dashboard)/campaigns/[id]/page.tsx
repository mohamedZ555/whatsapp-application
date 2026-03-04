import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  getActorFromSession,
  isSuperAdmin,
  resolveOptionalVendorFilter,
} from "@/lib/rbac";

const QUEUE_STATUS_CLS: Record<number, string> = {
  1: "bg-gray-100 text-gray-600",
  2: "bg-green-100 text-green-700",
  3: "bg-red-100 text-red-700",
  4: "bg-orange-100 text-orange-700",
};

const LOG_STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-100 text-green-700",
  delivered: "bg-emerald-100 text-emerald-700",
  read: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
};

const STATUS_CLS: Record<number, string> = {
  1: "bg-blue-50 text-blue-700 border border-blue-100",
  2: "bg-yellow-50 text-yellow-700 border border-yellow-100",
  3: "bg-green-50 text-green-700 border border-green-100",
  5: "bg-red-50 text-red-700 border border-red-100",
};

export default async function CampaignDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("campaigns");
  const tc = await getTranslations("common");

  const { id } = await params;
  const actor = getActorFromSession(session);
  if (!actor) notFound();

  // Super admin can view any campaign; vendor users only their own
  const vendorFilter = resolveOptionalVendorFilter(actor);
  const where = vendorFilter
    ? { id, vendorId: vendorFilter }
    : isSuperAdmin(actor)
      ? { id }
      : { id: "__no_access__" };

  const campaign = await prisma.campaign.findFirst({
    where,
    include: {
      template: true,
      messageLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              waId: true,
              phoneNumber: true,
            },
          },
        },
      },
      messageQueues: {
        orderBy: { createdAt: "desc" },
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              waId: true,
              phoneNumber: true,
            },
          },
        },
      },
      _count: { select: { messageLogs: true, messageQueues: true } },
    },
  });

  if (!campaign) notFound();

  // Translate campaign status to label key
  function statusKey(
    status: number,
  ): "upcoming" | "processing" | "executed" | "cancelled" {
    if (status === 1) return "upcoming";
    if (status === 2) return "processing";
    if (status === 3) return "executed";
    return "cancelled";
  }

  // Translate queue status
  function queueStatusText(status: number): string {
    if (status === 1) return t("queuePending");
    if (status === 2) return t("queueSent");
    if (status === 3) return t("queueFailed");
    if (status === 4) return t("queueCancelled");
    return String(status);
  }

  const statusCls = STATUS_CLS[campaign.status] ?? "bg-gray-100 text-gray-700";

  // Aggregate log stats
  const logMap = campaign.messageLogs.reduce<Record<string, number>>(
    (acc, log) => {
      const s = log.status.toLowerCase();
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const totalQueued = campaign._count.messageQueues;
  const totalSent = logMap["sent"] ?? 0;
  const totalDelivered = logMap["delivered"] ?? 0;
  const totalRead = logMap["read"] ?? 0;
  const totalFailed = logMap["failed"] ?? 0;
  const successRate =
    totalQueued > 0
      ? Math.round(((totalDelivered + totalRead) / totalQueued) * 100)
      : 0;

  // Queue breakdown
  const queuePending = campaign.messageQueues.filter(
    (q) => q.status === 1,
  ).length;
  const queueSent = campaign.messageQueues.filter((q) => q.status === 2).length;
  const queueFailed = campaign.messageQueues.filter(
    (q) => q.status === 3,
  ).length;
  const queueCancelled = campaign.messageQueues.filter(
    (q) => q.status === 4,
  ).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/campaigns"
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-2 w-fit"
          >
            ← {t("backToCampaigns")}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("campaignDetails")}</p>
        </div>
        <span
          className={`text-xs px-3 py-1.5 rounded-full font-semibold shrink-0 ${statusCls}`}
        >
          {t(statusKey(campaign.status))}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">{t("selectTemplate")}</p>
          <p className="text-base font-semibold text-gray-900 truncate">
            {campaign.template?.templateName ?? tc("na")}
          </p>
          {campaign.template && (
            <p className="text-xs text-gray-400 mt-0.5 capitalize">
              {campaign.template.category} · {campaign.template.languageCode}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">{t("scheduledFor")}</p>
          <p className="text-base font-semibold text-gray-900">
            {campaign.scheduledAt
              ? new Date(campaign.scheduledAt).toLocaleDateString()
              : tc("na")}
          </p>
          {campaign.scheduledAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(campaign.scheduledAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">{t("createdAt")}</p>
          <p className="text-base font-semibold text-gray-900">
            {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(campaign.createdAt).toLocaleTimeString()}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">{t("successRate")}</p>
          <p className="text-2xl font-bold text-emerald-600">{successRate}%</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalDelivered + totalRead} / {totalQueued} delivered
          </p>
        </div>
      </div>

      {/* Delivery Stats */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          {t("recentActivity")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: t("totalQueued"),
              value: totalQueued,
              color: "text-gray-800",
              bg: "bg-gray-50",
            },
            {
              label: t("totalSent"),
              value: totalSent,
              color: "text-blue-700",
              bg: "bg-blue-50",
            },
            {
              label: "Delivered / Read",
              value: `${totalDelivered} / ${totalRead}`,
              color: "text-emerald-700",
              bg: "bg-emerald-50",
            },
            {
              label: t("totalFailed"),
              value: totalFailed,
              color: "text-red-700",
              bg: "bg-red-50",
            },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Queue Status Breakdown */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          {t("queueStatus")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: t("queuePending"),
              value: queuePending,
              cls: "bg-gray-50 text-gray-700",
            },
            {
              label: t("queueSent"),
              value: queueSent,
              cls: "bg-green-50 text-green-700",
            },
            {
              label: t("queueFailed"),
              value: queueFailed,
              cls: "bg-red-50 text-red-700",
            },
            {
              label: t("queueCancelled"),
              value: queueCancelled,
              cls: "bg-orange-50 text-orange-700",
            },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`${cls} rounded-xl p-3 text-center`}>
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Contacts (Queue) */}
      <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-emerald-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {t("assignedContacts")}
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({totalQueued})
            </span>
          </h2>
          {campaign.status !== 2 && campaign.status !== 5 && (
            <Link
              href="/campaigns"
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              + {t("assignContacts")}
            </Link>
          )}
        </div>
        {campaign.messageQueues.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            {t("noAssignedContacts")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/60 border-b border-emerald-100">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    Contact
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    {t("phone")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    {t("queueStatus")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    {t("scheduledFor")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    {t("createdAt")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaign.messageQueues.map((q) => {
                  const contactName =
                    [q.contact.firstName, q.contact.lastName]
                      .filter(Boolean)
                      .join(" ") || q.contact.waId;
                  const qCls =
                    QUEUE_STATUS_CLS[q.status] ?? "bg-gray-100 text-gray-600";
                  return (
                    <tr key={q.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {contactName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {q.contact.waId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${qCls}`}
                        >
                          {queueStatusText(q.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {q.scheduledAt
                          ? new Date(q.scheduledAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(q.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Logs */}
      <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-emerald-100">
          <h2 className="font-semibold text-gray-900">
            {t("recentActivity")} — Logs
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({campaign._count.messageLogs})
            </span>
          </h2>
        </div>
        {campaign.messageLogs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            {tc("noData")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/60 border-b border-emerald-100">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    Contact
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    {tc("status")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    {t("message")}
                  </th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">
                    {t("createdAt")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaign.messageLogs.map((log) => {
                  const contactName =
                    [log.contact.firstName, log.contact.lastName]
                      .filter(Boolean)
                      .join(" ") || log.contact.waId;
                  const logCls =
                    LOG_STATUS_COLORS[log.status.toLowerCase()] ??
                    "bg-gray-100 text-gray-600";
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {contactName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${logCls}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {log.messageContent ?? `[${log.messageType}]`}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
