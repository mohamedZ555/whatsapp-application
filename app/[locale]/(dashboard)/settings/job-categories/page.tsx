'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: number;
  vendorUserDetail?: { id: string; userId: string } | null;
};

type Category = {
  id: string;
  uid: string;
  name: string;
  description: string | null;
  color: string | null;
  status: number;
  employees: Array<{
    id: string;
    userId: string;
    user: { id: string; firstName: string; lastName: string; email: string; status: number };
  }>;
};

const COLOR_PRESETS = [
  '#6c757d', '#2563eb', '#16a34a', '#dc2626', '#d97706',
  '#7c3aed', '#db2777', '#0891b2', '#059669', '#65a30d',
];

function CategoryFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Category;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? '#6c757d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    try {
      const method = initial ? 'PUT' : 'POST';
      const body = initial
        ? { id: initial.id, name, description, color }
        : { name, description, color };
      const res = await fetch('/api/job-categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) { onSaved(); onClose(); }
      else setError(data.error ?? 'Error');
    } catch { setError('Error'); }
    finally { setLoading(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {initial ? 'Edit Category' : 'New Job Category'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-rose-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Account Manager, Technical Support…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full border-0 cursor-pointer p-0"
                title="Custom color"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? 'Saving…' : initial ? 'Save Changes' : 'Create Category'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function AssignEmployeeModal({
  category,
  allEmployees,
  onClose,
  onSaved,
}: {
  category: Category;
  allEmployees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const assignedIds = new Set(category.employees.map((e) => e.userId));
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      // Employees to assign (now selected but not before)
      const toAssign = [...selected].filter((id) => !assignedIds.has(id));
      // Employees to unassign (was selected but now removed)
      const toUnassign = [...assignedIds].filter((id) => !selected.has(id));

      const ops = [
        ...toAssign.map((userId) =>
          fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, jobCategoryId: category.id }),
          })
        ),
        ...toUnassign.map((userId) =>
          fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, jobCategoryId: null }),
          })
        ),
      ];

      await Promise.all(ops);
      onSaved();
      onClose();
    } catch { setError('Error saving assignments'); }
    finally { setLoading(false); }
  }

  const available = allEmployees.filter((e) => e.status !== 5);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Employees</h2>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: category.color ?? '#6c757d' }} />
              {category.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {available.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No employees found. Add team members first.</p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-1 pr-1">
            {available.map((emp) => {
              const isSelected = selected.has(emp.id);
              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50 border border-emerald-200' : 'border border-transparent hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(emp.id)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{emp.email}</p>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-semibold text-emerald-600 shrink-0">Assigned</span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex gap-2 pt-3 border-t border-slate-100 mt-3 shrink-0">
          <button onClick={handleSave} disabled={loading || available.length === 0}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save Assignments'}
          </button>
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function JobCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [assignCat, setAssignCat] = useState<Category | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, empRes] = await Promise.all([
        fetch('/api/job-categories'),
        fetch('/api/users?roleId=3'),
      ]);
      const catData = await catRes.json();
      const empData = await empRes.json();
      setCategories(catData.categories ?? []);
      setAllEmployees(Array.isArray(empData) ? empData : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Employees will be unassigned and bot flows will lose their category link.')) return;
    try {
      const res = await fetch(`/api/job-categories?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.error ?? 'Error');
    } catch { alert('Error'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create categories like Account Manager, Technical, or Sales — then assign employees and link them to bot flows for smart message routing.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm"
        >
          + New Category
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-white p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-2xl mb-2">🗂️</p>
          <p className="font-semibold text-slate-700">No job categories yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Create categories to organize your team and route bot flows to the right people.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col"
            >
              {/* Color bar */}
              <div className="h-1.5 w-full" style={{ backgroundColor: cat.color ?? '#6c757d' }} />

              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: cat.color ?? '#6c757d' }}
                    />
                    <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                    {cat.employees.length} employee{cat.employees.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {cat.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{cat.description}</p>
                )}

                {/* Employee avatars */}
                {cat.employees.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {cat.employees.slice(0, 5).map((e) => (
                      <div
                        key={e.userId}
                        title={`${e.user.firstName} ${e.user.lastName}`}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                        style={{ backgroundColor: cat.color ?? '#6c757d' }}
                      >
                        {e.user.firstName[0]?.toUpperCase()}{e.user.lastName[0]?.toUpperCase()}
                      </div>
                    ))}
                    {cat.employees.length > 5 && (
                      <span className="text-xs text-slate-400">+{cat.employees.length - 5} more</span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mb-3">No employees assigned</p>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
                <button
                  onClick={() => setAssignCat(cat)}
                  className="flex-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold py-1.5 hover:bg-emerald-100 transition-colors"
                >
                  Assign Employees
                </button>
                <button
                  onClick={() => setEditCat(cat)}
                  className="rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="rounded-lg border border-rose-200 text-rose-500 text-xs font-semibold px-3 py-1.5 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works hint */}
      {categories.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-sm font-semibold text-blue-800 mb-1">How routing works</p>
          <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
            <li>Create a bot flow and assign it a job category</li>
            <li>When a message triggers that flow, it is routed to employees in that category</li>
            <li>Only assigned employees see and handle the conversation in their chat inbox</li>
          </ul>
        </div>
      )}

      {/* Modals */}
      {mounted && showCreate && (
        <CategoryFormModal onClose={() => setShowCreate(false)} onSaved={fetchData} />
      )}
      {mounted && editCat && (
        <CategoryFormModal initial={editCat} onClose={() => setEditCat(null)} onSaved={fetchData} />
      )}
      {mounted && assignCat && (
        <AssignEmployeeModal
          category={assignCat}
          allEmployees={allEmployees}
          onClose={() => setAssignCat(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
