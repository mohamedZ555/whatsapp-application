'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type CmsPage = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  showInMenu: boolean;
  status: number;
  createdAt: Date;
};

type PageForm = { title: string; slug: string; content: string; showInMenu: boolean; status: number };

export default function AdminPagesClient({ pages: init }: { pages: CmsPage[] }) {
  const tAdmin = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [pages, setPages] = useState(init);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [form, setForm] = useState<PageForm>({ title: '', slug: '', content: '', showInMenu: false, status: 1 });
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const refreshPages = async () => {
    const res = await fetch('/api/admin/pages');
    const data = await res.json();
    setPages(data.pages);
  };

  const openCreate = () => {
    setForm({ title: '', slug: '', content: '', showInMenu: false, status: 1 });
    setEditing(null);
    setModal('create');
  };

  const openEdit = (p: CmsPage) => {
    setForm({ title: p.title, slug: p.slug, content: p.content ?? '', showInMenu: p.showInMenu, status: p.status });
    setEditing(p);
    setModal('edit');
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/pages/seed', { method: 'POST' });
      const data = await res.json();
      const created = (data.results ?? []).filter((r: { action: string }) => r.action === 'created');
      await refreshPages();
      alert('Seed complete. Created: ' + created.length + ', Already existed: ' + ((data.results ?? []).length - created.length));
    } finally {
      setSeeding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = modal === 'edit' && editing ? '/api/admin/pages/' + editing.id : '/api/admin/pages';
      const method = modal === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? tCommon('error')); return; }
      await refreshPages();
      setModal(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tAdmin('deletePageConfirm'))) return;
    await fetch('/api/admin/pages/' + id, { method: 'DELETE' });
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[40px] font-normal leading-none tracking-tight text-emerald-950">{tAdmin('pages')}</h1>
        <div className="flex gap-2">
          <button onClick={handleSeed} disabled={seeding} className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
            {seeding ? tAdmin('seeding') : tAdmin('seedTermsPrivacy')}
          </button>
          <button onClick={openCreate} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            + {tAdmin('newPage')}
          </button>
        </div>
      </div>

      <section className="rounded-md border border-emerald-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-[13px] text-slate-600">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/50 text-[11px] uppercase tracking-[0.12em] text-slate-600">
              <th className="px-4 py-3 text-start font-semibold">{tAdmin('titleColumn')}</th>
              <th className="px-4 py-3 text-start font-semibold">{tAdmin('slug')}</th>
              <th className="px-4 py-3 text-start font-semibold">{tAdmin('inMenu')}</th>
              <th className="px-4 py-3 text-start font-semibold">{tCommon('status')}</th>
              <th className="px-4 py-3 text-start font-semibold">{tCommon('view')}</th>
              <th className="px-4 py-3 text-start font-semibold">{tCommon('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  {tAdmin('noPages')}{' '}
                  <button onClick={handleSeed} className="text-emerald-600 hover:underline font-medium">
                    {tAdmin('seedTermsPrivacy')}
                  </button>
                </td>
              </tr>
            )}
            {pages.map((page) => (
              <tr key={page.id} className="border-b border-emerald-50 hover:bg-emerald-50/30">
                <td className="px-4 py-3 font-medium text-emerald-800">{page.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">/{page.slug}</td>
                <td className="px-4 py-3">
                  <span className={page.showInMenu ? 'rounded px-2 py-0.5 text-[11px] font-semibold bg-green-100 text-green-700' : 'rounded px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-500'}>
                    {page.showInMenu ? tCommon('yes') : tCommon('no')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={page.status === 1 ? 'rounded px-2 py-0.5 text-[11px] font-semibold bg-green-100 text-green-700' : 'rounded px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700'}>
                    {page.status === 1 ? tAdmin('published') : tAdmin('draft')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/page/${page.slug}`} target="_blank" className="text-xs text-blue-600 hover:underline">
                    {tCommon('view')} →
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(page)} className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      {tCommon('edit')}
                    </button>
                    <button onClick={() => handleDelete(page.id)} className="rounded border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                      {tCommon('delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal === 'create' ? tAdmin('createPage') : tAdmin('editPage')}
              </h2>
              <button onClick={() => setModal(null)} className="text-2xl leading-none text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{tAdmin('titleColumn')}</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{tAdmin('slug')}</label>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="e.g. terms"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {tAdmin('contentHtml')}
                </label>
                <textarea
                  rows={14}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-y"
                />
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.showInMenu}
                    onChange={(e) => setForm({ ...form, showInMenu: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  {tAdmin('showInMenuLabel')}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  {tCommon('status')}:
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none"
                  >
                    <option value={1}>{tAdmin('published')}</option>
                    <option value={0}>{tAdmin('draft')}</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {tCommon('cancel')}
                </button>
                <button type="submit" disabled={loading} className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {loading ? tCommon('saving') : tCommon('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
