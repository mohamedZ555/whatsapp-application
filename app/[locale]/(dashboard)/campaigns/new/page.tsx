"use client";

import { FormEvent, useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

interface Contact {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  waId: string;
  phoneNumber?: string | null;
}

interface Group {
  id: string;
  name: string;
  color?: string | null;
  _count: { contacts: number };
}

const COLOR_PRESETS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

export default function CampaignNewPage() {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  const router = useRouter();

  const [templates, setTemplates] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [groupLoading, setGroupLoading] = useState(false);

  // Group creation state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(COLOR_PRESETS[0]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group management modal
  const [manageGroupModal, setManageGroupModal] = useState<{
    open: boolean;
    groupId: string;
    groupName: string;
    groupColor: string;
    currentMemberIds: string[];
  }>({
    open: false,
    groupId: "",
    groupName: "",
    groupColor: COLOR_PRESETS[0],
    currentMemberIds: [],
  });
  const [manageGroupSearch, setManageGroupSearch] = useState("");
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    templateId: "",
    scheduledAt: "",
    contactIds: [] as string[],
  });

  const fetchGroups = useCallback(() => {
    fetch("/api/contacts/groups")
      .then((r) => r.json())
      .then((d) => setGroups(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/whatsapp/templates"),
      fetch("/api/contacts?limit=500"),
    ])
      .then(async ([tplRes, ctRes]) => {
        const tplData = await tplRes.json();
        const ctData = await ctRes.json();
        setTemplates(Array.isArray(tplData) ? tplData : []);
        setContacts(Array.isArray(ctData?.data) ? ctData.data : []);
      })
      .catch(() => {});
    fetchGroups();
  }, [fetchGroups]);

  // Select all group members for the campaign
  const handleGroupSelect = async (groupId: string) => {
    setGroupLoading(true);
    try {
      const res = await fetch(`/api/contacts?groupId=${groupId}&limit=500`);
      const data = await res.json();
      const ids: string[] = Array.isArray(data?.data)
        ? data.data.map((c: Contact) => c.id)
        : [];
      setForm((s) => ({
        ...s,
        contactIds: Array.from(new Set([...s.contactIds, ...ids])),
      }));
    } catch {
      /* ignore */
    } finally {
      setGroupLoading(false);
    }
  };

  // Create a new group inline
  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/contacts/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          color: newGroupColor,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewGroupName("");
        setShowCreateGroup(false);
        fetchGroups();
      }
    } catch {
      /* ignore */
    } finally {
      setCreatingGroup(false);
    }
  };

  // Delete a group
  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm(tc("confirmDelete"))) return;
    setDeletingGroupId(groupId);
    try {
      const res = await fetch(`/api/contacts/groups?id=${groupId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchGroups();
    } catch {
      /* ignore */
    } finally {
      setDeletingGroupId(null);
    }
  };

  // Open manage group modal and fetch members
  const openManageGroup = async (group: Group) => {
    setManageGroupModal({
      open: true,
      groupId: group.id,
      groupName: group.name,
      groupColor: group.color || COLOR_PRESETS[0],
      currentMemberIds: [],
    });
    try {
      const res = await fetch(`/api/contacts/groups/${group.id}/contacts`);
      const members: Contact[] = await res.json();
      setManageGroupModal((prev) => ({
        ...prev,
        currentMemberIds: members.map((m) => m.id),
      }));
    } catch {
      /* ignore */
    }
  };

  // Add or remove a contact from the group
  const toggleGroupMember = async (contactId: string, isMember: boolean) => {
    setIsUpdatingGroup(true);
    try {
      if (isMember) {
        // Remove
        await fetch(
          `/api/contacts/groups/${manageGroupModal.groupId}/contacts`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactIds: [contactId] }),
          },
        );
        setManageGroupModal((prev) => ({
          ...prev,
          currentMemberIds: prev.currentMemberIds.filter(
            (id) => id !== contactId,
          ),
        }));
      } else {
        // Add
        await fetch(
          `/api/contacts/groups/${manageGroupModal.groupId}/contacts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactIds: [contactId] }),
          },
        );
        setManageGroupModal((prev) => ({
          ...prev,
          currentMemberIds: [...prev.currentMemberIds, contactId],
        }));
      }
      fetchGroups(); // Update counts in cards
    } catch {
      /* ignore */
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const visibleContacts = useMemo(() => {
    const q = contactSearch.toLowerCase();
    return contacts.filter((c) => {
      const name = [c.firstName, c.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const phone = (c.waId + (c.phoneNumber ?? "")).toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [contacts, contactSearch]);

  const manageGroupList = useMemo(() => {
    const q = manageGroupSearch.toLowerCase();
    return contacts
      .filter((c) => {
        const name = [c.firstName, c.lastName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const phone = (c.waId + (c.phoneNumber ?? "")).toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
      .sort((a, b) => {
        // Sort members to the top
        const aIsMember = manageGroupModal.currentMemberIds.includes(a.id);
        const bIsMember = manageGroupModal.currentMemberIds.includes(b.id);
        if (aIsMember && !bIsMember) return -1;
        if (!aIsMember && bIsMember) return 1;
        return 0;
      });
  }, [contacts, manageGroupSearch, manageGroupModal.currentMemberIds]);

  const selectAll = () => {
    setForm((s) => ({
      ...s,
      contactIds: Array.from(
        new Set([...s.contactIds, ...visibleContacts.map((c) => c.id)]),
      ),
    }));
  };

  const deselectAll = () => {
    const visibleSet = new Set(visibleContacts.map((c) => c.id));
    setForm((s) => ({
      ...s,
      contactIds: s.contactIds.filter((id) => !visibleSet.has(id)),
    }));
  };

  const allVisibleSelected =
    visibleContacts.length > 0 &&
    visibleContacts.every((c) => form.contactIds.includes(c.id));

  const contactName = (c: Contact) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || c.waId;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        templateId: form.templateId || null,
        scheduledAt: form.scheduledAt || null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/campaigns");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t("createCampaign")}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Info */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("campaignName")}
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Summer Promo"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("selectTemplate")}
              </label>
              <select
                value={form.templateId}
                onChange={(e) =>
                  setForm((s) => ({ ...s, templateId: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option value="">{t("noTemplate")}</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.templateName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("scheduledFor")}
              </label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm((s) => ({ ...s, scheduledAt: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
        </div>

        {/* Groups */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {t("selectGroups")}
            </h2>
            <button
              type="button"
              onClick={() => setShowCreateGroup(!showCreateGroup)}
              className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
            >
              + {t("createGroup")}
            </button>
          </div>

          {showCreateGroup && (
            <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <input
                  type="text"
                  placeholder={t("groupName")}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {t("groupColor")}:
                  </span>
                  <div className="flex gap-1">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewGroupColor(color)}
                        className={`w-5 h-5 rounded-full border-2 ${newGroupColor === color ? "border-gray-800" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={creatingGroup || !newGroupName.trim()}
                  onClick={handleCreateGroup}
                  className="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg"
                >
                  {creatingGroup ? tc("saving") : t("createGroup")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-1.5 text-xs text-gray-500"
                >
                  {tc("cancel")}
                </button>
              </div>
            </div>
          )}

          {groups.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              {t("noGroups")}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="border rounded-xl p-3 relative group overflow-hidden transition-all hover:border-emerald-200 shadow-sm"
                  style={{ borderLeft: `4px solid ${g.color || "#e5e7eb"}` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-12">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {g.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("contactsInGroup", { count: g._count.contacts })}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openManageGroup(g)}
                        className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        ⚙
                      </button>
                      <button
                        type="button"
                        disabled={deletingGroupId === g.id}
                        onClick={() => handleDeleteGroup(g.id)}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={groupLoading}
                    onClick={() => handleGroupSelect(g.id)}
                    className="mt-3 w-full py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    + {t("assignGroupToCampaign")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recipients */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-900">
              {t("selectRecipients")}
              {form.contactIds.length > 0 && (
                <span className="ml-2 text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {t("selectedCount", { count: form.contactIds.length })}
                </span>
              )}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={selectAll}
                disabled={allVisibleSelected}
                className="text-xs text-emerald-600 hover:underline"
              >
                {t("selectAll")}
              </button>
              <button
                type="button"
                onClick={deselectAll}
                disabled={form.contactIds.length === 0}
                className="text-xs text-gray-500 hover:underline"
              >
                {t("deselectAll")}
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder={t("searchContacts")}
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"
          />
          <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
            {visibleContacts.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">
                {t("noContactsFound")}
              </p>
            )}
            {visibleContacts.map((contact) => (
              <label
                key={contact.id}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={form.contactIds.includes(contact.id)}
                  onChange={(e) => {
                    setForm((s) => ({
                      ...s,
                      contactIds: e.target.checked
                        ? [...s.contactIds, contact.id]
                        : s.contactIds.filter((id) => id !== contact.id),
                    }));
                  }}
                  className="w-4 h-4 accent-emerald-500 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {contactName(contact)}
                  </p>
                  <p className="text-xs text-gray-400">{contact.waId}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? tc("saving") : t("createCampaign")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/campaigns")}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            {tc("cancel")}
          </button>
        </div>
      </form>

      {manageGroupModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity"
            onClick={() => setManageGroupModal((p) => ({ ...p, open: false }))}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            {/* Modal Header with Dynamic Identity Color */}
            <div
              className="px-8 py-6 text-white relative overflow-hidden"
              style={{ backgroundColor: manageGroupModal.groupColor }}
            >
              {/* Decorative Background Pattern */}
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="10"
                  />
                  <path
                    d="M10 50H90"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M50 10V90"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">
                    {t("manageGroups")}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
                    <p className="text-sm font-medium opacity-90 uppercase tracking-widest">
                      {manageGroupModal.groupName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setManageGroupModal((p) => ({ ...p, open: false }))
                  }
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors flex items-center justify-center text-white backdrop-blur-sm"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Bar with themed shadow */}
            <div className="p-4 bg-white border-b border-gray-50">
              <div className="relative group">
                <input
                  type="text"
                  placeholder={t("searchContacts")}
                  value={manageGroupSearch}
                  onChange={(e) => setManageGroupSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                  style={
                    { "--tw-ring-color": manageGroupModal.groupColor } as any
                  }
                />
                <svg
                  className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-2">
                {manageGroupList.map((contact) => {
                  const isMember = manageGroupModal.currentMemberIds.includes(
                    contact.id,
                  );
                  return (
                    <div
                      key={contact.id}
                      className={`group flex items-center justify-between p-3 rounded-2xl transition-all border ${
                        isMember
                          ? "bg-opacity-5 border-opacity-20 shadow-sm"
                          : "bg-white border-gray-50 hover:border-gray-100 hover:bg-gray-50"
                      }`}
                      style={{
                        backgroundColor: isMember
                          ? `${manageGroupModal.groupColor}08`
                          : undefined,
                        borderColor: isMember
                          ? manageGroupModal.groupColor
                          : undefined,
                      }}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-105 ${isMember ? "text-white" : "bg-gray-100 text-gray-500"}`}
                          style={{
                            backgroundColor: isMember
                              ? manageGroupModal.groupColor
                              : undefined,
                          }}
                        >
                          {contact.firstName?.[0] || contact.waId[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {contactName(contact)}
                          </p>
                          <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            {contact.waId}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isUpdatingGroup}
                        onClick={() => toggleGroupMember(contact.id, isMember)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all font-black text-lg disabled:opacity-50 ${
                          isMember
                            ? "bg-red-50 text-red-600 hover:bg-red-100 shadow-sm hover:rotate-12"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-110"
                        }`}
                        style={{
                          backgroundColor:
                            !isMember && manageGroupList.length > 0
                              ? undefined
                              : undefined,
                          color: isMember ? undefined : undefined,
                        }}
                      >
                        {isMember ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M20 12H4"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: manageGroupModal.groupColor }}
                />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                  {manageGroupModal.currentMemberIds.length}{" "}
                  {t("currentMembers")}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setManageGroupModal((p) => ({ ...p, open: false }))
                }
                className="px-8 py-2.5 rounded-2xl text-sm font-black text-white shadow-xl hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center gap-2"
                style={{ backgroundColor: manageGroupModal.groupColor }}
              >
                {tc("done")}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
