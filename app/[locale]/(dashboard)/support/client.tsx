"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Reply = { id: string; content: string; isAdmin: boolean; createdAt: Date };
type Ticket = {
  id: string;
  uid: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  replies: Reply[];
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

type NewForm = { subject: string; message: string; priority: string };

export default function VendorSupportClient({
  tickets: initialTickets,
  total,
  page,
  limit,
}: {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
}) {
  const t = useTranslations("support");
  const tCommon = useTranslations("common");
  const [tickets, setTickets] = useState(initialTickets);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [view, setView] = useState<"list" | "new">("list");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [newForm, setNewForm] = useState<NewForm>({
    subject: "",
    message: "",
    priority: "normal",
  });
  const [creating, setCreating] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Map priority values to translation keys
  const PRIORITY_LABELS: Record<string, string> = {
    low: t("priorityLow"),
    normal: t("priorityNormal"),
    high: t("priorityHigh"),
    urgent: t("priorityUrgent"),
  };

  // Map status values to translation keys
  const STATUS_LABELS: Record<string, string> = {
    open: t("statusOpen"),
    in_progress: t("statusInProgress"),
    resolved: t("statusResolved"),
    closed: t("statusClosed"),
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? t("error"));
        return;
      }
      setTickets((prev) => [data.ticket, ...prev]);
      setSelected(data.ticket);
      setView("list");
      setNewForm({ subject: "", message: "", priority: "normal" });
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      const data = await res.json();
      const updated = {
        ...selected,
        replies: [...selected.replies, data.reply],
      };
      setSelected(updated);
      setTickets((prev) =>
        prev.map((tk) => (tk.id === selected.id ? updated : tk)),
      );
      setReply("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <button
          onClick={() => {
            setView("new");
            setSelected(null);
          }}
          className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
        >
          {t("newTicket")}
        </button>
      </div>

      {view === "new" ? (
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            {t("openNewTicket")}
          </h2>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("subject")}
              </label>
              <input
                required
                value={newForm.subject}
                onChange={(e) =>
                  setNewForm({ ...newForm, subject: e.target.value })
                }
                placeholder={t("subjectPlaceholder")}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("priority")}
              </label>
              <select
                value={newForm.priority}
                onChange={(e) =>
                  setNewForm({ ...newForm, priority: e.target.value })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-400"
              >
                {(["low", "normal", "high", "urgent"] as const).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("message")}
              </label>
              <textarea
                required
                rows={6}
                value={newForm.message}
                onChange={(e) =>
                  setNewForm({ ...newForm, message: e.target.value })
                }
                placeholder={t("messagePlaceholder")}
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-green-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
              >
                {creating ? t("submitting") : t("submitTicket")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Ticket list */}
          <div className="lg:col-span-2 space-y-2">
            {tickets.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                <p className="text-sm text-gray-400">{t("noTicketsYet")}</p>
                <button
                  onClick={() => setView("new")}
                  className="mt-3 text-sm font-medium text-green-600 hover:underline"
                >
                  {t("openFirstTicket")}
                </button>
              </div>
            )}
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  selected?.id === ticket.id
                    ? "border-green-400 bg-green-50"
                    : "border-gray-100 bg-white hover:border-green-200"
                }`}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-semibold text-gray-900">
                    {ticket.subject}
                  </p>
                  <span
                    className={`flex-shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
                      STATUS_COLORS[ticket.status] ??
                      "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {STATUS_LABELS[ticket.status] ??
                      ticket.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>#{ticket.uid.slice(0, 8)}</span>
                  <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <Link
                  href={`/support?page=${Math.max(1, page - 1)}`}
                  className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                    hasPrev
                      ? "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      : "cursor-not-allowed border-gray-200 text-gray-400"
                  }`}
                  aria-disabled={!hasPrev}
                >
                  {tCommon("previous")}
                </Link>
                <span className="text-xs text-gray-400">
                  {page}/{totalPages}
                </span>
                <Link
                  href={`/support?page=${Math.min(totalPages, page + 1)}`}
                  className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                    hasNext
                      ? "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      : "cursor-not-allowed border-gray-200 text-gray-400"
                  }`}
                  aria-disabled={!hasNext}
                >
                  {tCommon("next")}
                </Link>
              </div>
            )}
          </div>

          {/* Ticket detail */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
                {t("selectTicket")}
              </div>
            ) : (
              <div
                className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm"
                style={{ maxHeight: "75vh" }}
              >
                {/* Header */}
                <div className="border-b border-gray-100 px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900">
                        {selected.subject}
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-400">
                        #{selected.uid.slice(0, 8)} &middot; {t("priority")}:{" "}
                        <span className="capitalize">
                          {PRIORITY_LABELS[selected.priority] ??
                            selected.priority}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_COLORS[selected.status] ??
                        "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {STATUS_LABELS[selected.status] ??
                        selected.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  {selected.replies.map((r) => (
                    <div
                      key={r.id}
                      className={`flex ${r.isAdmin ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          r.isAdmin
                            ? "bg-gray-100 text-gray-800"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        {r.isAdmin && (
                          <p className="mb-1 text-xs font-semibold text-gray-500">
                            {t("supportTeam")}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{r.content}</p>
                        <p
                          className={`mt-1.5 text-[11px] ${
                            r.isAdmin ? "text-gray-400" : "text-green-200"
                          }`}
                        >
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply */}
                {selected.status !== "closed" &&
                selected.status !== "resolved" ? (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <textarea
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={t("replyPlaceholder")}
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={handleSendReply}
                        disabled={sending || !reply.trim()}
                        className="rounded-xl bg-green-500 px-5 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
                      >
                        {sending ? t("sending") : t("sendReply")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 px-5 py-3 text-center text-xs text-gray-400">
                    {t("ticketIs")}{" "}
                    {STATUS_LABELS[selected.status] ?? selected.status}.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
