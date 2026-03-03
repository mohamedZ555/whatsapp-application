'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { cn, getInitials } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { USER_ROLES } from '@/lib/constants';
import { getPusherClient, PUSHER_EVENTS } from '@/lib/pusher';

type ChatFilter = 'all' | 'unread' | 'mine' | 'unassigned';

export default function ChatPage({ params }: { params: Promise<{ contactId?: string[] }> }) {
  const { contactId } = use(params);
  const selectedContactId = contactId?.[0] ?? null;
  const t = useTranslations('chat');
  const tc = useTranslations('common');
  const router = useRouter();
  const { data: session } = useSession();
  const roleId = (session?.user as any)?.roleId as number | undefined;
  const canAssign = roleId === USER_ROLES.SUPER_ADMIN || roleId === USER_ROLES.VENDOR;
  const vendorUid = (session?.user as any)?.vendorUid as string | undefined;

  const [contacts, setContacts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function refreshContacts() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (chatFilter !== 'all') params.set('chatFilter', chatFilter);
    fetch(`/api/chat/contacts?${params.toString()}`)
      .then((r) => r.json())
      .then(setContacts)
      .catch(() => {});
  }

  // Fetch sidebar contacts
  useEffect(() => {
    refreshContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, chatFilter]);

  // Fetch messages when contact selected
  useEffect(() => {
    if (!selectedContactId) return;
    fetch(`/api/chat/messages/${selectedContactId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setActiveContact(d.contact ?? null);
        // Refresh contacts sidebar to clear unread count after opening conversation
        refreshContacts();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContactId]);

  useEffect(() => {
    if (!activeContact || !canAssign) return;
    const vendorQuery = activeContact.vendorId ? `?vendorId=${encodeURIComponent(activeContact.vendorId)}` : '';
    fetch(`/api/chat/team${vendorQuery}`)
      .then((r) => r.json())
      .then((data) => setTeamMembers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [activeContact?.id, canAssign]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pusher real-time subscription
  useEffect(() => {
    if (!vendorUid) return;

    const pusher = getPusherClient();
    const channelName = `private-vendor-${vendorUid}`;
    const channel = pusher.subscribe(channelName);

    channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (data: any) => {
      if (data.log?.contactId === selectedContactId) {
        setMessages((prev) => {
          const alreadyExists = prev.some((m) => m.id === data.log.id);
          if (alreadyExists) return prev;
          return [...prev, data.log];
        });
      }
      // Always refresh sidebar to update unread counts / last message preview
      refreshContacts();
    });

    channel.bind(PUSHER_EVENTS.MESSAGE_STATUS, (data: any) => {
      if (data.waMessageId && data.status) {
        setMessages((prev) =>
          prev.map((m) =>
            m.waMessageId === data.waMessageId ? { ...m, status: data.status } : m
          )
        );
      }
    });

    channel.bind(PUSHER_EVENTS.CONTACT_UPDATE, () => {
      refreshContacts();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorUid, selectedContactId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !selectedContactId || sending) return;
    setSending(true);
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: selectedContactId, messageType: 'text', messageContent: text }),
    });
    const data = await res.json();
    setSending(false);
    if (data.success) {
      setText('');
      setMessages((prev) => [...prev, data.data]);
    }
  }

  async function handleAssign(assignedUserId: string) {
    if (!activeContact || assigning) return;
    setAssigning(true);
    await fetch('/api/chat/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: activeContact.id, assignedUserId: assignedUserId || null }),
    });
    setAssigning(false);
    const refreshed = await fetch(`/api/chat/messages/${activeContact.id}`).then((r) => r.json());
    setActiveContact(refreshed.contact ?? null);
    refreshContacts();
  }

  const contactName = (c: any) =>
    [c.firstName, c.lastName].filter(Boolean).join(' ') || c.waId;

  function renderMessageStatus(msg: any) {
    if (msg.isIncomingMessage) return null;
    if (msg.status === 'read') {
      return <span className="ms-1 text-blue-300">✓✓</span>;
    }
    if (msg.status === 'delivered') {
      return <span className="ms-1 text-green-200">✓✓</span>;
    }
    return <span className="ms-1 text-green-200">✓</span>;
  }

  const filterLabels: { key: ChatFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'mine', label: 'Mine' },
    { key: 'unassigned', label: 'Unassigned' },
  ];

  return (
    <div className="flex h-full rounded-xl border border-gray-200 overflow-hidden">
      {/* Contacts Sidebar */}
      <div className="w-72 bg-white border-e border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">{t('recentChats')}</h2>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {filterLabels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChatFilter(key)}
                className={
                  chatFilter === key
                    ? 'bg-green-500 text-white text-xs rounded-full px-3 py-1'
                    : 'text-xs rounded-full px-3 py-1 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contact count */}
          <p className="text-xs text-gray-400 mb-2">
            {contacts.length} conversation{contacts.length !== 1 ? 's' : ''}
          </p>

          <input
            type="text"
            placeholder={tc('search') + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/chat/${c.id}`)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-start',
                selectedContactId === c.id && 'bg-green-50'
              )}
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold text-green-700 flex-shrink-0">
                {getInitials(c.firstName ?? c.waId, c.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">{contactName(c)}</p>
                  {c.unreadMessagesCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {c.unreadMessagesCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {c.messageLogs?.[0]?.messageContent ?? c.waId}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selectedContactId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p>{t('selectContact')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
              {activeContact && (
                <>
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold text-green-700">
                    {getInitials(activeContact.firstName ?? activeContact.waId, activeContact.lastName)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{contactName(activeContact)}</p>
                    <p className="text-xs text-gray-500">{activeContact.waId}</p>
                  </div>
                  {canAssign && (
                    <div className="ms-auto">
                      <select
                        value={activeContact.assignedUserId ?? ''}
                        disabled={assigning}
                        onChange={(e) => handleAssign(e.target.value)}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700"
                      >
                        <option value="">{t('unassigned')}</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex', msg.isIncomingMessage ? 'justify-start' : 'justify-end')}
                >
                  <div
                    className={cn(
                      'max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm',
                      msg.isIncomingMessage
                        ? 'bg-white text-gray-900 rounded-tl-sm'
                        : 'bg-green-500 text-white rounded-tr-sm'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.messageContent ?? `[${msg.messageType}]`}
                    </p>
                    <p className={cn('text-xs mt-1', msg.isIncomingMessage ? 'text-gray-400' : 'text-green-100')}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {renderMessageStatus(msg)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="bg-white border-t border-gray-200 p-4 flex gap-3">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('typeMessage')}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {t('send')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
