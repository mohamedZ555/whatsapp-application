'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  waId: string;
  email?: string;
  countryId?: number;
  status: number;
  languageCode?: string;
  createdAt: string;
  messagedAt?: string;
  groups?: Array<{ contactGroup: { id: string; name: string; color: string } }>;
  labels?: Array<{ label: { id: string; name: string; color: string } }>;
}

interface Group {
  id: string;
  name: string;
  color: string;
  _count?: { contacts: number };
}

interface Template {
  id: string;
  templateName: string;
  templateStatus: string;
  languageCode: string;
  data?: any;
}

type ModalType = 'create' | 'edit' | 'sendTemplate' | 'details' | 'import' | null;

export default function ContactsPage() {
  const t = useTranslations('contacts');
  const tc = useTranslations('common');
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const tr = (en: string, ar: string) => (isArabic ? ar : en);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);

  // Templates (for send template modal)
  const [templates, setTemplates] = useState<Template[]>([]);

  // Modals
  const [modal, setModal] = useState<ModalType>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  // Form states
  const [form, setForm] = useState({ firstName: '', lastName: '', waId: '', email: '', groupIds: [] as string[] });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Send template modal
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [sendError, setSendError] = useState('');

  // Import
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null);

  // Bulk action
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (assignedFilter) params.set('assigned', assignedFilter);
    if (sortBy) params.set('orderBy', sortBy);
    if (groupFilter) params.set('groupId', groupFilter);
    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.data ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, limit, search, statusFilter, assignedFilter, sortBy, groupFilter]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    fetch('/api/contacts/groups').then(r => r.json()).then(d => setGroups(Array.isArray(d) ? d : []));
    fetch('/api/whatsapp/templates').then(r => r.json()).then(d => setTemplates(Array.isArray(d) ? d.filter((t: Template) => t.templateStatus === 'APPROVED') : []));
  }, []);

  const totalPages = Math.ceil(total / limit);

  // Selection
  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  }

  function selectAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }

  // Delete
  async function deleteContact(id: string) {
    if (!confirm(tc('confirmDelete'))) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    fetchContacts();
  }

  // Bulk delete
  async function bulkDelete() {
    if (!selectedIds.size || !confirm(isArabic ? `حذف ${selectedIds.size} جهة اتصال؟` : `Delete ${selectedIds.size} contacts?`)) return;
    setBulkLoading(true);
    await Promise.all([...selectedIds].map((id) => fetch(`/api/contacts/${id}`, { method: 'DELETE' })));
    setSelectedIds(new Set());
    setBulkLoading(false);
    fetchContacts();
  }

  // Create / Edit contact
  function openCreate() {
    setForm({ firstName: '', lastName: '', waId: '', email: '', groupIds: [] });
    setFormError('');
    setModal('create');
  }

  function openEdit(c: Contact) {
    setActiveContact(c);
    setForm({ firstName: c.firstName ?? '', lastName: c.lastName ?? '', waId: c.waId, email: c.email ?? '', groupIds: c.groups?.map((g) => g.contactGroup.id) ?? [] });
    setFormError('');
    setModal('edit');
  }

  async function saveContact() {
    setFormSaving(true);
    setFormError('');
    if (!form.waId) { setFormError(tr('Phone number is required.', 'رقم الهاتف مطلوب.')); setFormSaving(false); return; }
    if (modal === 'create') {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? tr('Failed to create.', 'فشل الإنشاء.')); setFormSaving(false); return; }
    } else if (modal === 'edit' && activeContact) {
      const res = await fetch(`/api/contacts/${activeContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? tr('Failed to update.', 'فشل التحديث.')); setFormSaving(false); return; }
    }
    setFormSaving(false);
    setModal(null);
    fetchContacts();
  }

  // Send template
  function openSendTemplate(c: Contact) {
    setActiveContact(c);
    setSelectedTemplateId('');
    setTemplateVars([]);
    setSendError('');
    setModal('sendTemplate');
  }

  function onTemplateChange(id: string) {
    setSelectedTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const body = tpl.data?.components?.find((c: any) => c.type === 'BODY');
    const bodyText: string = body?.text ?? '';
    const vars = bodyText.match(/\{\{\d+\}\}/g) ?? [];
    setTemplateVars(vars.map(() => ''));
  }

  async function sendTemplate() {
    if (!selectedTemplateId || !activeContact) return;
    setSendingTemplate(true);
    setSendError('');
    const tpl = templates.find((t) => t.id === selectedTemplateId)!;
    const comps: any[] = [];
    if (templateVars.length > 0) {
      comps.push({
        type: 'body',
        parameters: templateVars.map((v) => ({ type: 'text', text: v })),
      });
    }
    const res = await fetch('/api/whatsapp/templates/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: activeContact.id, templateId: tpl.id, components: comps }),
    });
    const data = await res.json();
    setSendingTemplate(false);
    if (!res.ok) { setSendError(data.error ?? tr('Failed to send.', 'فشل الإرسال.')); return; }
    setModal(null);
  }

  // Import contacts
  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    const lines = importText.trim().split('\n').filter(Boolean);
    let imported = 0, failed = 0;
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      const waId = parts[0];
      const firstName = parts[1] ?? '';
      if (!waId) { failed++; continue; }
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waId, firstName }),
      });
      if (res.ok) imported++; else failed++;
    }
    setImporting(false);
    setImportResult({ imported, failed });
    fetchContacts();
  }

  // Export contacts as CSV
  function exportCSV() {
    const rows = [[
      tr('First Name', 'الاسم الأول'),
      tr('Last Name', 'اسم العائلة'),
      tr('Phone', 'الهاتف'),
      tr('Email', 'البريد الإلكتروني'),
      tr('Status', 'الحالة'),
      tr('Created At', 'تاريخ الإنشاء'),
    ]];
    contacts.forEach((c) => rows.push([
      c.firstName ?? '', c.lastName ?? '', c.waId, c.email ?? '',
      c.status === 1 ? tr('Active', 'نشط') : tr('Inactive', 'غير نشط'),
      new Date(c.createdAt).toLocaleString(isArabic ? 'ar' : undefined),
    ]));
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = isArabic ? 'جهات-الاتصال.csv' : 'contacts.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} {tc('results')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('exportContacts')}
          </button>
          <button onClick={() => setModal('import')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t('importContacts')}
          </button>
          <button onClick={openCreate} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('addContact')}
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">
            {isArabic ? `${selectedIds.size} محدد` : `${selectedIds.size} selected`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={bulkDelete}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {bulkLoading ? tr('Deleting...', 'جاري الحذف...') : tr('Delete Selected', 'حذف المحدد')}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-medium hover:bg-gray-50">
              {tr('Clear', 'مسح')}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 flex flex-wrap gap-3 items-center shadow-sm">
        <input
          type="text"
          placeholder={t('search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[200px]"
        />
        <select
          value={groupFilter}
          onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{tr('All Groups', 'كل المجموعات')}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{tr('All Statuses', 'كل الحالات')}</option>
          <option value="1">{tc('active')}</option>
          <option value="2">{tc('inactive')}</option>
        </select>
        <select
          value={assignedFilter}
          onChange={(e) => { setAssignedFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{tr('All Assignments', 'كل الإسنادات')}</option>
          <option value="me">{tr('Assigned to me', 'مسند إليّ')}</option>
          <option value="none">{tr('Unassigned', 'غير مسند')}</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="created">{tr('Created Date', 'تاريخ الإنشاء')}</option>
          <option value="messaged">{tr('Last Messaged', 'آخر مراسلة')}</option>
          <option value="name">{tr('Name A-Z', 'الاسم أ-ي')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === contacts.length && contacts.length > 0}
                  onChange={selectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{t('firstName')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{t('lastName')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{t('phone')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{t('email')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{tc('status')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{t('groups')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{tc('createdAt')}</th>
              <th className="text-start px-4 py-3 font-semibold text-gray-600 uppercase text-xs tracking-wide">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && [...Array(5)].map((_, i) => (
              <tr key={i}>
                {[...Array(9)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                ))}
              </tr>
            ))}
            {!loading && contacts.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">{tc('noData')}</td></tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id} className={`hover:bg-gray-50 ${selectedIds.has(c.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-700 font-bold flex-shrink-0">
                      {(c.firstName?.[0] ?? c.waId[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{c.firstName ?? '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.lastName ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{c.waId}</td>
                <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.status === 1 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status === 1 ? tc('active') : tc('inactive')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.groups?.map((g) => (
                      <span key={g.contactGroup.id} style={{ backgroundColor: g.contactGroup.color + '20', color: g.contactGroup.color }} className="text-xs px-2 py-0.5 rounded-full font-medium">
                        {g.contactGroup.name}
                      </span>
                    )) ?? '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString(isArabic ? 'ar' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => { setActiveContact(c); setModal('details'); }}
                      className="px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      {tr('Details', 'التفاصيل')}
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
                    >
                      {tc('edit')}
                    </button>
                    <button
                      onClick={() => openSendTemplate(c)}
                      className="px-2.5 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                      </svg>
                      {tr('Send', 'إرسال')}
                    </button>
                    <Link
                      href={`/chat/${c.id}`}
                      className="px-2.5 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium"
                    >
                      {tr('Chat', 'دردشة')}
                    </Link>
                    <button
                      onClick={() => deleteContact(c.id)}
                      className="px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                    >
                      {tc('delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">
            {tc('previous')}
          </button>
          <span className="text-sm text-gray-600">{tc('page')} {page} {tc('of')} {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">
            {tc('next')}
          </button>
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Create / Edit Contact Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">
                {modal === 'create' ? t('addContact') : isArabic ? 'تحرير جهة اتصال' : `${tc('edit')} Contact`}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')}</label>
                  <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')}</label>
                  <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')} <span className="text-red-500">*</span></label>
                <input type="text" value={form.waId} onChange={(e) => setForm({ ...form, waId: e.target.value })}
                  placeholder={tr('e.g. 966501234567', 'مثال: 966501234567')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <p className="text-xs text-gray-400 mt-1">{tr('Include country code, no + or spaces.', 'أدخل رمز الدولة بدون + أو مسافات.')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {groups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('groups')}</label>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          const ids = form.groupIds.includes(g.id) ? form.groupIds.filter(id => id !== g.id) : [...form.groupIds, g.id];
                          setForm({ ...form, groupIds: ids });
                        }}
                        style={form.groupIds.includes(g.id) ? { backgroundColor: g.color, color: '#fff' } : { borderColor: g.color, color: g.color }}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${form.groupIds.includes(g.id) ? '' : 'bg-transparent'}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={saveContact} disabled={formSaving} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                {formSaving ? tc('saving') : (modal === 'create' ? tc('create') : tc('save'))}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                {tc('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Template Modal */}
      {modal === 'sendTemplate' && activeContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">
                {isArabic
                  ? `إرسال نموذج إلى ${activeContact.firstName ?? activeContact.waId}`
                  : `Send Template to ${activeContact.firstName ?? activeContact.waId}`}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {sendError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{sendError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tr('Select Template', 'اختر النموذج')}</label>
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-500">{tr('No approved templates available.', 'لا توجد نماذج معتمدة.')} <Link href="/templates/create" className="text-green-600 hover:underline">{tr('Create one', 'إنشاء نموذج')}</Link>.</p>
                ) : (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => onTemplateChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">{tr('-- Select template --', '-- اختر نموذجًا --')}</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.templateName} ({tpl.languageCode})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Template preview */}
              {selectedTemplateId && (() => {
                const tpl = templates.find((t) => t.id === selectedTemplateId);
                if (!tpl) return null;
                const body = tpl.data?.components?.find((c: any) => c.type === 'BODY');
                return (
                  <div className="bg-[#e5ddd5] rounded-xl p-3">
                    <div className="bg-white rounded-xl shadow-sm p-3 text-sm max-w-[90%]">
                      <p className="text-gray-800 whitespace-pre-line">{body?.text ?? ''}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Variables */}
              {templateVars.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{tr('Fill in Variables', 'املأ المتغيرات')}</label>
                  <div className="space-y-2">
                    {templateVars.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium w-12 text-center">{`{{${i + 1}}}`}</span>
                        <input
                          type="text"
                          value={v}
                          onChange={(e) => { const arr = [...templateVars]; arr[i] = e.target.value; setTemplateVars(arr); }}
                          placeholder={isArabic ? `قيمة {{${i + 1}}}` : `Value for {{${i + 1}}}`}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={sendTemplate}
                disabled={sendingTemplate || !selectedTemplateId}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                {sendingTemplate ? tr('Sending...', 'جاري الإرسال...') : tr('Send Message', 'إرسال الرسالة')}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                {tc('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Modal */}
      {modal === 'details' && activeContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">{tr('Contact Details', 'تفاصيل جهة الاتصال')}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-xl text-green-700 font-bold">
                  {(activeContact.firstName?.[0] ?? activeContact.waId[0] ?? '?').toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{activeContact.firstName} {activeContact.lastName}</p>
                  <p className="text-sm text-gray-500">{activeContact.waId}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  [tr('Phone', 'الهاتف'), activeContact.waId],
                  [tr('Email', 'البريد الإلكتروني'), activeContact.email ?? '-'],
                  [tr('Status', 'الحالة'), activeContact.status === 1 ? tr('Active', 'نشط') : tr('Inactive', 'غير نشط')],
                  [tr('Created', 'تاريخ الإنشاء'), new Date(activeContact.createdAt).toLocaleString(isArabic ? 'ar' : undefined)],
                  [tr('Last Messaged', 'آخر مراسلة'), activeContact.messagedAt ? new Date(activeContact.messagedAt).toLocaleString(isArabic ? 'ar' : undefined) : '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
              {activeContact.groups && activeContact.groups.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">{t('groups')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeContact.groups.map((g) => (
                      <span key={g.contactGroup.id} style={{ backgroundColor: g.contactGroup.color + '20', color: g.contactGroup.color }} className="text-xs px-2.5 py-1 rounded-full font-medium">
                        {g.contactGroup.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => openEdit(activeContact)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                {tc('edit')}
              </button>
              <button onClick={() => { setModal(null); openSendTemplate(activeContact); }} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                {tr('Send Template', 'إرسال نموذج')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {modal === 'import' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">{t('importContacts')}</h3>
              <button onClick={() => { setModal(null); setImportResult(null); setImportText(''); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">{t('importHint')} {tr('Format', 'التنسيق')}: <code className="bg-gray-100 px-1 rounded">phone,firstName</code></p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                placeholder={"966501234567,Ahmed\n966507654321,Sara\n201012345678"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              {importResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <span className="text-green-700 font-medium">{t('imported')}: {importResult.imported}</span>
                  {importResult.failed > 0 && <span className="text-red-600 ml-3 font-medium">{t('failed')}: {importResult.failed}</span>}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={handleImport} disabled={importing || !importText.trim()} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                {importing ? tr('Importing...', 'جاري الاستيراد...') : tc('import')}
              </button>
              <button onClick={() => { setModal(null); setImportResult(null); setImportText(''); }} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                {tc('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
