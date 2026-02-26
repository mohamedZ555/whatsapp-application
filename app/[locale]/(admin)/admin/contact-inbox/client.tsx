'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type ContactMsg = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
};

export default function ContactInboxClient({ messages: initial }: { messages: ContactMsg[] }) {
  const tCommon = useTranslations('common');
  const [messages, setMessages] = useState(initial);
  const [selected, setSelected] = useState<ContactMsg | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await fetch('/api/admin/contact-inbox', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[40px] font-normal leading-none tracking-tight text-emerald-950">Contact Inbox</h1>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="lg:col-span-1 space-y-2 max-h-[75vh] overflow-y-auto">
          {messages.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-slate-400">
              No messages yet.
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => setSelected(msg)}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                selected?.id === msg.id
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-gray-100 bg-white hover:border-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{msg.name}</p>
                  <p className="truncate text-xs text-gray-500">{msg.email}</p>
                </div>
                <p className="flex-shrink-0 text-[11px] text-gray-400">
                  {new Date(msg.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-gray-500">{msg.message}</p>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
              Select a message to view details
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  <a href={`mailto:${selected.email}`} className="text-sm text-emerald-600 hover:underline">
                    {selected.email}
                  </a>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Received: {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`mailto:${selected.email}?subject=Re: Your message to FadaaWhats`}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Reply via Email
                  </a>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    {tCommon('delete')}
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
