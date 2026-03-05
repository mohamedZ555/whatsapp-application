"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const FlowBuilder = dynamic(() => import("./FlowBuilder"), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────

type OptionItem = { id: string; title: string };

type ReplyForm = {
  replyName: string;
  triggerType: string;
  triggerSubject: string;
  replyMessage: string;
  replyType: "text" | "buttons" | "list";
  buttonText: string; // list button label
  options: OptionItem[]; // dynamic options for buttons / list rows
};

type JobCategory = { id: string; name: string; color: string };
type TeamUser = { id: string; firstName: string; lastName: string };

type Flow = {
  id: string;
  flowName: string;
  description: string | null;
  status: number;
  jobCategoryId: string | null;
  data: any;
  createdAt: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const TRIGGER_TYPES = [
  "welcome",
  "is",
  "starts_with",
  "ends_with",
  "contains_word",
  "contains",
  "stop_promotional",
  "start_promotional",
  "start_ai_bot",
  "stop_ai_bot",
];

const DEFAULT_FORM: ReplyForm = {
  replyName: "",
  triggerType: "is",
  triggerSubject: "",
  replyMessage: "",
  replyType: "text",
  buttonText: "View Options",
  options: [],
};

// ─── Page ──────────────────────────────────────────────────────────────────

export default function BotRepliesPage() {
  const t = useTranslations("bot");
  const tc = useTranslations("common");

  // Map trigger type keys to translation keys
  const TRIGGER_LABELS: Record<string, string> = {
    welcome: t("welcome"),
    is: t("exactMatch"),
    starts_with: t("startsWith"),
    ends_with: t("endsWith"),
    contains_word: t("containsWord"),
    contains: t("contains"),
    stop_promotional: t("stopPromotional"),
    start_promotional: t("startPromotional"),
    start_ai_bot: t("startAiBot"),
    stop_ai_bot: t("stopAiBot"),
  };

  const [tab, setTab] = useState<"replies" | "flows">("replies");

  // ── Quick Replies ────────────────────────────────────────────────────────
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReply, setEditingReply] = useState<any | null>(null);
  const [form, setForm] = useState<ReplyForm>(DEFAULT_FORM);
  const [savingReply, setSavingReply] = useState(false);

  // ── Flows ────────────────────────────────────────────────────────────────
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [totalNodesLimit, setTotalNodesLimit] = useState<number>(-1);
  const [totalNodesUsed, setTotalNodesUsed] = useState<number>(0);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [builderFlow, setBuilderFlow] = useState<Flow | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  async function fetchReplies() {
    setLoadingReplies(true);
    const res = await fetch("/api/bot-replies");
    const data = await res.json();
    setReplies(Array.isArray(data) ? data : []);
    setLoadingReplies(false);
  }

  async function fetchFlows() {
    setLoadingFlows(true);
    const res = await fetch("/api/bot-flows");
    const data = await res.json();
    setFlows(Array.isArray(data) ? data : []);
    setLoadingFlows(false);
  }

  async function fetchCategories() {
    const res = await fetch("/api/job-categories");
    const data = await res.json();
    setCategories(Array.isArray(data.categories) ? data.categories : []);
  }

  async function fetchUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    const list = Array.isArray(data.users) ? data.users : [];
    setUsers(list.map((u: any) => ({ id: u.userId ?? u.id, firstName: u.firstName ?? "", lastName: u.lastName ?? "" })));
  }

  async function fetchNodeLimit() {
    const res = await fetch("/api/subscription/usage");
    if (!res.ok) return;
    const data = await res.json();
    const limit = data.plan?.features?.botFlowNodes;
    if (typeof limit === "number") setTotalNodesLimit(limit);
    const usageItem = Array.isArray(data.items)
      ? data.items.find((i: any) => i.key === "botFlowNodes")
      : null;
    if (usageItem) setTotalNodesUsed(usageItem.used ?? 0);
  }

  useEffect(() => {
    fetchReplies();
    fetchFlows();
    fetchCategories();
    fetchUsers();
    fetchNodeLimit();
  }, []);

  // ── Option item helpers ──────────────────────────────────────────────────

  function addOption() {
    setForm((f) => ({
      ...f,
      options: [...f.options, { id: uid(), title: "" }],
    }));
  }

  function removeOption(id: string) {
    setForm((f) => ({ ...f, options: f.options.filter((o) => o.id !== id) }));
  }

  function updateOption(id: string, title: string) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o) => (o.id === id ? { ...o, title } : o)),
    }));
  }

  function resetForm() {
    setForm(DEFAULT_FORM);
    setEditingReply(null);
    setShowForm(false);
  }

  function openCreateForm() {
    setForm(DEFAULT_FORM);
    setEditingReply(null);
    setShowForm(true);
  }

  function openEditForm(reply: any) {
    const existing = reply.data ?? {};
    let options: OptionItem[] = [];

    if (reply.replyType === "buttons" && Array.isArray(existing.buttons)) {
      options = existing.buttons.map((b: any) => ({
        id: b.id ?? uid(),
        title: b.title ?? "",
      }));
    } else if (reply.replyType === "list") {
      const rows = existing.sections?.[0]?.rows ?? [];
      options = rows.map((r: any) => ({
        id: r.id ?? uid(),
        title: r.title ?? "",
      }));
    }

    setForm({
      replyName: reply.replyName ?? "",
      triggerType: reply.triggerType ?? "is",
      triggerSubject: reply.triggerSubject ?? "",
      replyMessage: reply.replyMessage ?? "",
      replyType: reply.replyType ?? "text",
      buttonText: existing.buttonText ?? "View Options",
      options,
    });
    setEditingReply(reply);
    setShowForm(true);
  }

  // ── Save reply ───────────────────────────────────────────────────────────

  async function handleSaveReply(e: React.FormEvent) {
    e.preventDefault();
    setSavingReply(true);

    let data: any = {};
    const validOptions = form.options.filter((o) => o.title.trim());

    if (form.replyType === "buttons") {
      data = {
        buttons: validOptions.map((o, i) => ({
          id: o.id || `btn_${i + 1}`,
          title: o.title.trim(),
        })),
      };
    } else if (form.replyType === "list") {
      data = {
        buttonText: form.buttonText.trim() || "View Options",
        sections: [
          {
            title: t("optionsLabel"),
            rows: validOptions.map((o, i) => ({
              id: o.id || `row_${i + 1}`,
              title: o.title.trim(),
            })),
          },
        ],
      };
    }

    const payload = {
      replyName: form.replyName,
      triggerType: form.triggerType,
      triggerSubject: form.triggerSubject,
      replyMessage: form.replyMessage,
      replyType: form.replyType,
      data,
    };

    if (editingReply) {
      await fetch("/api/bot-replies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingReply.id, ...payload }),
      });
    } else {
      await fetch("/api/bot-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setSavingReply(false);
    resetForm();
    fetchReplies();
  }

  async function handleDeleteReply(id: string) {
    if (!confirm(tc("confirmDelete"))) return;
    await fetch(`/api/bot-replies?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    fetchReplies();
  }

  async function handleToggleReplyStatus(reply: any) {
    await fetch("/api/bot-replies", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: reply.id,
        status: reply.status === 1 ? 2 : 1,
      }),
    });
    fetchReplies();
  }

  // ── Flow handlers ────────────────────────────────────────────────────────

  async function handleCreateFlow(e: React.FormEvent) {
    e.preventDefault();
    if (!newFlowName.trim()) return;
    setCreatingFlow(true);
    const res = await fetch("/api/bot-flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flowName: newFlowName.trim(),
        data: {
          trigger: { type: "keyword", value: "" },
          startNodeId: "start_1",
          nodes: [
            { id: "start_1", type: "start", _x: 60, _y: 200, text: "Start" },
            { id: "node_end", type: "end", _x: 400, _y: 200 },
          ],
        },
      }),
    });
    const json = await res.json();
    setCreatingFlow(false);
    setShowCreateFlow(false);
    setNewFlowName("");
    if (json.success && json.data) {
      await fetchFlows();
      setBuilderFlow(json.data);
    }
  }

  async function handleDeleteFlow(id: string) {
    if (!confirm(tc("confirmDelete"))) return;
    await fetch(`/api/bot-flows/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    fetchFlows();
  }

  async function handleToggleFlowStatus(flow: Flow) {
    await fetch(`/api/bot-flows/${encodeURIComponent(flow.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: flow.status === 1 ? 2 : 1 }),
    });
    fetchFlows();
  }

  // ── Open visual builder ──────────────────────────────────────────────────

  if (builderFlow) {
    // Compute how many nodes this specific flow can have:
    // total limit - nodes used in OTHER flows
    const currentFlowNodeCount = Array.isArray(builderFlow.data?.nodes)
      ? builderFlow.data.nodes.length
      : 0;
    const effectiveNodeLimit =
      totalNodesLimit === -1
        ? -1
        : totalNodesLimit - (totalNodesUsed - currentFlowNodeCount);

    return (
      <FlowBuilder
        flow={builderFlow}
        categories={categories}
        users={users}
        nodeLimitPerFlow={effectiveNodeLimit}
        onClose={() => setBuilderFlow(null)}
        onSaved={() => {
          setBuilderFlow(null);
          fetchFlows();
          fetchNodeLimit();
        }}
      />
    );
  }

  // ── Trigger keyword placeholder ──────────────────────────────────────────

  function getTriggerKeywordPlaceholder() {
    if (form.triggerType === "is") return t("triggerKeywordExact");
    if (form.triggerType === "starts_with")
      return t("triggerKeywordStartsWith");
    return t("triggerKeywordGeneric");
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <div className="flex rounded-lg border border-gray-300 bg-white p-1 text-sm shadow-sm">
          <button
            onClick={() => setTab("replies")}
            className={`rounded-md px-4 py-1.5 font-medium transition-colors ${tab === "replies" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            {t("quickReplies")}
          </button>
          <button
            onClick={() => setTab("flows")}
            className={`rounded-md px-4 py-1.5 font-medium transition-colors ${tab === "flows" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            {t("flowBuilder")}
          </button>
        </div>
      </div>

      {/* ═══════════════ QUICK REPLIES TAB ═══════════════ */}
      {tab === "replies" && (
        <div>
          {/* Toolbar */}
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t("repliesConfigured", { count: replies.length })}
            </p>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <span className="text-base leading-none">+</span>
              {t("createBotReply")}
            </button>
          </div>

          {/* ── Reply Form ── */}
          {showForm && (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
              {/* Form header */}
              <div
                className={`px-6 py-4 flex items-center justify-between ${editingReply ? "bg-blue-600" : "bg-emerald-600"}`}
              >
                <h2 className="font-semibold text-white text-base">
                  {editingReply
                    ? `✏️ ${t("editBotReply")}`
                    : `➕ ${t("createBotReply")}`}
                </h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-white/70 hover:text-white transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveReply} className="p-6 space-y-5">
                {/* Row 1: Name + Trigger type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      {t("replyNameLabel")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.replyName}
                      onChange={(e) =>
                        setForm({ ...form, replyName: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      placeholder={t("replyName") + " ..."}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      {t("triggerTypeLabel")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.triggerType}
                      onChange={(e) =>
                        setForm({ ...form, triggerType: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                      {TRIGGER_TYPES.map((tt) => (
                        <option key={tt} value={tt}>
                          {TRIGGER_LABELS[tt] ?? tt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Trigger keyword (hidden for welcome) */}
                {form.triggerType !== "welcome" &&
                  ![
                    "start_ai_bot",
                    "stop_ai_bot",
                    "start_promotional",
                    "stop_promotional",
                  ].includes(form.triggerType) && (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        {t("triggerKeywordLabel")}
                      </label>
                      <input
                        value={form.triggerSubject}
                        onChange={(e) =>
                          setForm({ ...form, triggerSubject: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        placeholder={getTriggerKeywordPlaceholder()}
                      />
                    </div>
                  )}

                {/* Reply type */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    {t("replyTypeLabel")}
                  </label>
                  <div className="flex gap-2">
                    {(["text", "buttons", "list"] as const).map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, replyType: rt, options: [] })
                        }
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          form.replyType === rt
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {rt === "text"
                          ? `📝 ${t("textReply")}`
                          : rt === "buttons"
                            ? `🔘 ${t("buttonsReply")}`
                            : `📋 ${t("listReply")}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reply message */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    {t("replyMessageLabel")}
                    {form.replyType !== "text" && (
                      <span className="ml-1 font-normal text-gray-400 text-xs">
                        {t("headerTextHint")}
                      </span>
                    )}
                  </label>
                  <textarea
                    value={form.replyMessage}
                    onChange={(e) =>
                      setForm({ ...form, replyMessage: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none"
                    placeholder={t("replyMessagePlaceholder")}
                  />
                </div>

                {/* ── Dynamic Options ── */}
                {(form.replyType === "buttons" ||
                  form.replyType === "list") && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700">
                        {form.replyType === "buttons"
                          ? `🔘 ${t("buttonsLabel")}`
                          : `📋 ${t("listRowsLabel")}`}
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
                          {form.options.length}
                          {form.replyType === "buttons" ? t("maxButtons") : ""}
                        </span>
                      </label>
                      {(form.replyType !== "buttons" ||
                        form.options.length < 3) && (
                        <button
                          type="button"
                          onClick={addOption}
                          className="flex items-center gap-1 rounded-lg border border-dashed border-emerald-400 px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          +{" "}
                          {form.replyType === "buttons"
                            ? t("addButton")
                            : t("addRow")}
                        </button>
                      )}
                    </div>

                    {form.options.length === 0 && (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-6 text-center text-sm text-gray-400">
                        {form.replyType === "buttons"
                          ? t("noButtonsYet")
                          : t("noRowsYet")}{" "}
                        <button
                          type="button"
                          onClick={addOption}
                          className="text-emerald-600 hover:underline"
                        >
                          {t("addOne")}
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {form.options.map((opt, idx) => (
                        <div
                          key={opt.id}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                        >
                          {/* Drag handle / number */}
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">
                            {idx + 1}
                          </span>

                          <input
                            type="text"
                            value={opt.title}
                            onChange={(e) =>
                              updateOption(opt.id, e.target.value)
                            }
                            placeholder={
                              form.replyType === "buttons"
                                ? t("buttonLabelPlaceholder")
                                : t("rowTitlePlaceholder")
                            }
                            maxLength={form.replyType === "buttons" ? 20 : 24}
                            className="flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-100"
                          />

                          {/* Character count */}
                          <span
                            className={`text-xs tabular-nums flex-shrink-0 ${opt.title.length >= (form.replyType === "buttons" ? 18 : 22) ? "text-orange-500" : "text-gray-400"}`}
                          >
                            {opt.title.length}/
                            {form.replyType === "buttons" ? 20 : 24}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeOption(opt.id)}
                            className="flex-shrink-0 rounded-md p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title={tc("delete")}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                            >
                              <path
                                d="M1 1l12 12M13 1L1 13"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* List button text */}
                    {form.replyType === "list" && (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {t("listButtonLabel")}
                        </label>
                        <input
                          value={form.buttonText}
                          onChange={(e) =>
                            setForm({ ...form, buttonText: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                          placeholder={t("listButtonPlaceholder")}
                          maxLength={20}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="submit"
                    disabled={savingReply}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {savingReply ? (
                      <>
                        <span className="animate-spin">⟳</span> {tc("saving")}
                      </>
                    ) : (
                      <>
                        {editingReply
                          ? `✅ ${t("updateReply")}`
                          : `✅ ${t("createReply")}`}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Reply List ── */}
          {loadingReplies && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <span className="animate-spin mr-2 text-xl">⟳</span>{" "}
              {t("loading")}
            </div>
          )}
          {!loadingReplies && replies.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
              <p className="mb-2 text-4xl">🤖</p>
              <p className="font-semibold text-gray-600">
                {t("noQuickRepliesYet")}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {t("noQuickRepliesDesc")}
              </p>
              <button
                onClick={openCreateForm}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {t("createFirstReply")}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {replies.map((r) => {
              const rData = r.data ?? {};
              const buttons = rData.buttons ?? [];
              const sections = rData.sections ?? [];
              const rows = sections[0]?.rows ?? [];

              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Type icon */}
                      <span className="text-lg flex-shrink-0">
                        {r.replyType === "buttons"
                          ? "🔘"
                          : r.replyType === "list"
                            ? "📋"
                            : "💬"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {r.replyName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                          {/* Trigger badge */}
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                            {TRIGGER_LABELS[r.triggerType] ?? r.triggerType}
                          </span>
                          {r.triggerSubject && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 border border-gray-200">
                              &quot;{r.triggerSubject}&quot;
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                              r.replyType === "buttons"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                : r.replyType === "list"
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : "bg-green-50 text-green-700 border-green-100"
                            }`}
                          >
                            {r.replyType === "buttons"
                              ? t("buttonsReply")
                              : r.replyType === "list"
                                ? t("listReply")
                                : t("textReply")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleToggleReplyStatus(r)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          r.status === 1
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {r.status === 1
                          ? `● ${t("statusActive")}`
                          : `○ ${t("statusInactive")}`}
                      </button>
                      <button
                        onClick={() => openEditForm(r)}
                        className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        {tc("edit")}
                      </button>
                      <button
                        onClick={() => handleDeleteReply(r.id)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        {tc("delete")}
                      </button>
                    </div>
                  </div>

                  {/* Reply message preview */}
                  {r.replyMessage && (
                    <div className="px-5 pb-2">
                      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 border border-gray-100 line-clamp-2">
                        {r.replyMessage}
                      </p>
                    </div>
                  )}

                  {/* Button options preview */}
                  {r.replyType === "buttons" && buttons.length > 0 && (
                    <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2">
                      {buttons.map((b: any) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                        >
                          🔘 {b.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* List rows preview */}
                  {r.replyType === "list" && rows.length > 0 && (
                    <div className="px-5 pb-4">
                      <p className="mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {t("listRowsLabel")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {rows.map((row: any) => (
                          <span
                            key={row.id}
                            className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                          >
                            📋 {row.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════ FLOWS TAB ═══════════════ */}
      {tab === "flows" && (
        <div>
          {/* Toolbar */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                {flows.length} {t("botFlows").toLowerCase()} · {categories.length}{" "}
                {t("jobCategoriesTitle").toLowerCase()}
              </span>
              {totalNodesLimit !== -1 && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    totalNodesUsed >= totalNodesLimit
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {t("totalNodes")}: {totalNodesUsed} / {totalNodesLimit}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowCreateFlow(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <span className="text-base leading-none">+</span>
              {t("createFlow")}
            </button>
          </div>

          {/* Create flow dialog */}
          {showCreateFlow && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-md">
              <h2 className="mb-4 font-semibold text-gray-900 text-base">
                {t("createFlow")}
              </h2>
              <form onSubmit={handleCreateFlow} className="flex gap-3">
                <input
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder={t("flowName")}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={creatingFlow}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {creatingFlow ? tc("loading") : t("createFlow")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateFlow(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {tc("cancel")}
                </button>
              </form>
            </div>
          )}

          {/* Loading */}
          {loadingFlows && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <span className="animate-spin mr-2 text-xl">⟳</span>{" "}
              {t("loading")}
            </div>
          )}

          {/* Empty */}
          {!loadingFlows && flows.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
              <p className="mb-2 text-4xl">🤖</p>
              <p className="font-semibold text-gray-600">{t("noFlowsYet")}</p>
              <p className="mt-1 text-sm text-gray-400">{t("noFlowsDesc")}</p>
              <button
                onClick={() => setShowCreateFlow(true)}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {t("createFirstFlow")}
              </button>
            </div>
          )}

          {/* Flow cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {flows.map((flow) => {
              const assignedCategory = flow.jobCategoryId
                ? categories.find((c) => c.id === flow.jobCategoryId)
                : null;
              const nodeCount = Array.isArray(flow.data?.nodes)
                ? flow.data.nodes.length
                : 0;
              const triggerType = flow.data?.trigger?.type ?? "keyword";
              const triggerValue = flow.data?.trigger?.value ?? "";

              return (
                <div
                  key={flow.id}
                  className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Card header */}
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white text-lg">🔀</span>
                      <span className="text-white font-semibold text-sm truncate">
                        {flow.flowName}
                      </span>
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        flow.status === 1
                          ? "bg-white/25 text-white"
                          : "bg-black/20 text-white/70"
                      }`}
                    >
                      {flow.status === 1
                        ? `● ${t("statusActive")}`
                        : `○ ${t("statusInactive")}`}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="px-4 py-3 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {t("triggerLabel")}
                      </span>
                      <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {triggerType}
                      </span>
                      {triggerValue && (
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">
                          &quot;{triggerValue}&quot;
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {t("nodesLabel")}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        {nodeCount}
                      </span>
                    </div>
                    {assignedCategory && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {t("categoryLabel")}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                          style={{ background: assignedCategory.color }}
                        >
                          {assignedCategory.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card actions */}
                  <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-2">
                    <button
                      onClick={() => setBuilderFlow(flow)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      ✏️ {t("flowBuilder")}
                    </button>
                    <button
                      onClick={() => handleToggleFlowStatus(flow)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        flow.status === 1
                          ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {flow.status === 1 ? t("pause") : t("activate")}
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDeleteFlow(flow.id)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      {tc("delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Categories info */}
          {categories.length > 0 && (
            <div className="mt-8 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                📂 {t("jobCategoriesTitle")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs shadow-sm"
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span className="font-medium text-gray-700">
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {t("jobCategoriesHint")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
