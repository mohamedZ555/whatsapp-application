"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Campaign {
  id: string;
  name: string;
  status: number;
  scheduledAt: string | null;
  createdAt: string;
  template?: {
    templateName: string;
    languageCode: string;
    category: string;
  } | null;
  _count: { messageLogs: number; messageQueues: number };
}

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(() => {
    setLoading(true);
    fetch(`/api/campaigns${filter ? `?status=${filter}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        setCampaigns(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function handleDelete(id: string) {
    if (!window.confirm(tc("confirmDelete"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/campaigns?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchCampaigns();
    } finally {
      setDeletingId(null);
    }
  }

  const statusLabel: Record<number, { label: string; color: string }> = {
    1: { label: t("upcoming"), color: "bg-blue-50 text-blue-700" },
    2: { label: t("processing"), color: "bg-yellow-50 text-yellow-700" },
    3: { label: t("executed"), color: "bg-green-50 text-green-700" },
    5: { label: t("cancelled"), color: "bg-red-50 text-red-700" },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href="/campaigns/new"
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
        >
          {t("createCampaign")}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["", "upcoming", "processing", "executed", "cancelled"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                filter === s
                  ? "bg-green-500 text-white border-green-500"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "" ? `${tc("filter")}: ${tc("active")}` : t(s as any)}
            </button>
          ),
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">
                {t("campaignName")}
              </th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">
                {t("selectTemplate")}
              </th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">
                {t("scheduledFor")}
              </th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">
                {tc("status")}
              </th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">
                {t("processed")}
              </th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">
                {tc("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {!loading && campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  {tc("noData")}
                </td>
              </tr>
            )}
            {campaigns.map((c) => {
              const status = statusLabel[c.status] ?? {
                label: String(c.status),
                color: "bg-gray-100 text-gray-600",
              };
              const canDelete = c.status !== 2;
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.template?.templateName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.scheduledAt
                      ? new Date(c.scheduledAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="text-xs">
                      {c._count.messageLogs} / {c._count.messageQueues}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        {tc("view")}
                      </Link>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === c.id ? "..." : tc("delete")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
