"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn, getInitials } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { USER_ROLES } from "@/lib/constants";
import { getPusherClient, PUSHER_EVENTS } from "@/lib/pusher";
import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

type ChatFilter = "all" | "unread" | "mine" | "unassigned";
type MediaType = "image" | "video" | "audio" | "document";

/* ─── Helpers ── */
function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDate(date: string | Date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
function isSameDay(a: string | Date, b: string | Date) {
  const da = new Date(a),
    db = new Date(b);
  return da.toDateString() === db.toDateString();
}
function getMimeCategory(mime: string): MediaType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

/* ─── Message Status Icon ── */
function MessageStatus({ status }: { status?: string }) {
  if (status === "read")
    return <span className="text-blue-400 text-[11px]">✓✓</span>;
  if (status === "delivered")
    return <span className="text-white/70 text-[11px]">✓✓</span>;
  if (status === "sent")
    return <span className="text-white/50 text-[11px]">✓</span>;
  return <span className="text-white/30 text-[11px]">⏱</span>;
}

/* ─── Template Modal ── */
function TemplateModal({
  contactId,
  onClose,
  onSent,
}: {
  contactId: string;
  onClose: () => void;
  onSent: (msg: any) => void;
}) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [compParams, setCompParams] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/whatsapp/templates")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setTemplates(list.filter((t: any) => t.templateStatus === "APPROVED"));
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  function buildComponents() {
    if (!selected) return [];
    const data = (selected.data as any) ?? {};
    const rawComps: any[] = data.components ?? [];
    const result: any[] = [];
    for (const comp of rawComps) {
      const type = comp.type?.toUpperCase();
      const params = compParams[type] ?? [];
      if (params.length === 0) continue;
      result.push({
        type,
        parameters: params.map((v) => ({ type: "text", text: v })),
      });
    }
    return result;
  }

  async function handleSend() {
    if (!selected) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/whatsapp/templates/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        templateId: selected.id,
        components: buildComponents(),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (data.success) {
      onSent({
        messageType: "template",
        data: { templateName: selected.templateName },
        status: "sent",
        isIncomingMessage: false,
        createdAt: new Date().toISOString(),
        id: Math.random().toString(),
      });
      onClose();
    } else {
      setError(data.error ?? "Failed to send template.");
    }
  }

  function getTemplateComponents(t: any): any[] {
    return (t?.data as any)?.components ?? [];
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600">
          <h3 className="text-white font-semibold text-base">
            📋 Send Template Message
          </h3>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Loading templates…
            </div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <p className="text-3xl mb-2">📭</p>
              <p>No approved templates found.</p>
              <p className="text-xs mt-1">
                Go to Templates page to create and approve templates first.
              </p>
            </div>
          ) : (
            templates.map((t) => {
              const comps = getTemplateComponents(t);
              const isSelected = selected?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelected(isSelected ? null : t);
                    setCompParams({});
                  }}
                  className={cn(
                    "rounded-xl border-2 p-4 cursor-pointer transition-all",
                    isSelected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-slate-800">
                      {t.templateName}
                    </p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      {t.languageCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{t.category}</p>

                  {/* Show template body preview */}
                  {comps
                    .filter((c: any) => c.type === "BODY")
                    .map((c: any, i: number) => (
                      <p
                        key={i}
                        className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-lg p-2 whitespace-pre-wrap"
                      >
                        {c.text}
                      </p>
                    ))}

                  {/* Parameter inputs if template has variables */}
                  {isSelected &&
                    comps.map((comp: any) => {
                      const type = comp.type?.toUpperCase();
                      const matches =
                        (comp.text ?? "").match(/\{\{(\d+)\}\}/g) ?? [];
                      if (matches.length === 0) return null;
                      const params = compParams[type] ?? [];
                      return (
                        <div key={type} className="mt-3 space-y-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {type} Parameters
                          </p>
                          {matches.map((_: any, idx: number) => (
                            <input
                              key={idx}
                              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                              placeholder={`{{${idx + 1}}} value`}
                              value={params[idx] ?? ""}
                              onChange={(e) => {
                                const updated = [...params];
                                updated[idx] = e.target.value;
                                setCompParams((p) => ({
                                  ...p,
                                  [type]: updated,
                                }));
                              }}
                            />
                          ))}
                        </div>
                      );
                    })}
                </div>
              );
            })
          )}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={!selected || sending}
            onClick={handleSend}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {sending ? "Sending…" : "Send Template"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Media Preview ── */
function MediaPreview({ msg }: { msg: any }) {
  const mediaData = (msg.data as any) ?? {};
  const type = msg.messageType as string;
  const url = mediaData.mediaUrl ?? mediaData.media_values?.url ?? null;
  const fileName = mediaData.fileName ?? null;
  const caption = msg.messageContent;
  const isOut = !msg.isIncomingMessage;

  if (type === "image") {
    if (url) {
      return (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="image"
            className="rounded-lg max-w-[200px] max-h-48 object-cover cursor-pointer"
            onClick={() => window.open(url, "_blank")}
          />
          {caption && <p className="text-xs mt-1 opacity-80">{caption}</p>}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 opacity-80">
        <span>🖼️</span>
        <span className="text-xs">{caption || fileName || "Image sent"}</span>
      </div>
    );
  }

  if (type === "video") {
    if (url) {
      return (
        <div>
          <video
            src={url}
            controls
            className="rounded-lg max-w-[220px] max-h-48"
          />
          {caption && <p className="text-xs mt-1 opacity-80">{caption}</p>}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 opacity-80">
        <span>🎬</span>
        <span className="text-xs">{caption || fileName || "Video sent"}</span>
      </div>
    );
  }

  if (type === "audio") {
    if (url) {
      return <audio src={url} controls className="max-w-[220px]" />;
    }
    // Audio sent via mediaId — no direct URL available from our DB, show placeholder
    return (
      <div
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${
          isOut ? "bg-emerald-600" : "bg-slate-100"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
            isOut ? "bg-white/20" : "bg-emerald-100"
          }`}
        >
          🎵
        </div>
        <div>
          <p
            className={`text-xs font-medium ${isOut ? "text-white" : "text-slate-700"}`}
          >
            {fileName || "Voice message"}
          </p>
          <p
            className={`text-[10px] ${isOut ? "text-white/60" : "text-slate-400"}`}
          >
            Audio
          </p>
        </div>
      </div>
    );
  }

  if (type === "document") {
    const ext = fileName?.split(".").pop()?.toUpperCase() ?? "DOC";
    const docIcon =
      ext === "PDF"
        ? "📕"
        : ext === "XLS" || ext === "XLSX"
          ? "📗"
          : ext === "PPT" || ext === "PPTX"
            ? "📙"
            : "📄";
    if (url) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs hover:bg-white/20 transition-colors"
        >
          {docIcon} <span className="underline">{fileName ?? "Document"}</span>
        </a>
      );
    }
    // Document sent via mediaId — no direct URL
    return (
      <div
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${
          isOut ? "bg-emerald-600" : "bg-slate-100"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
            isOut ? "bg-white/20" : "bg-emerald-100"
          }`}
        >
          {docIcon}
        </div>
        <div>
          <p
            className={`text-xs font-medium ${isOut ? "text-white" : "text-slate-700"}`}
          >
            {fileName ?? "Document"}
          </p>
          <p
            className={`text-[10px] ${isOut ? "text-white/60" : "text-slate-400"}`}
          >
            {ext}
          </p>
        </div>
      </div>
    );
  }

  if (type === "template") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs opacity-75">📋</span>
        <span className="text-xs">
          {mediaData.templateName ?? "Template message"}
        </span>
      </div>
    );
  }
  // fallback
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {msg.messageContent ?? `[${type}]`}
    </p>
  );
}

/* ─── Main Page ── */
export default function ChatPage({
  params,
}: {
  params: Promise<{ contactId?: string[] }>;
}) {
  const { contactId } = use(params);
  const selectedContactId = contactId?.[0] ?? null;
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const tr = (en: string, ar: string) => (isArabic ? ar : en);
  const router = useRouter();
  const { data: session } = useSession();
  const roleId = (session?.user as any)?.roleId as number | undefined;
  const canAssign =
    roleId === USER_ROLES.SUPER_ADMIN || roleId === USER_ROLES.VENDOR;
  const isAdmin =
    roleId === USER_ROLES.SUPER_ADMIN || roleId === USER_ROLES.VENDOR;
  const vendorUid = (session?.user as any)?.vendorUid as string | undefined;

  const [contacts, setContacts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Media state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const audioChunks = useRef<Blob[]>([]);

  // Dropdown menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Four separate hidden inputs — one per media type
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Track the media category the user selected (for sending the correct type)
  const [selectedFileType, setSelectedFileType] = useState<MediaType>("image");

  // Emoji & attach menus
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node))
        setShowEmojiPicker(false);
      if (attachRef.current && !attachRef.current.contains(e.target as Node))
        setShowAttachMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const refreshContacts = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (chatFilter !== "all") p.set("chatFilter", chatFilter);
    fetch(`/api/chat/contacts?${p}`)
      .then((r) => r.json())
      .then(setContacts)
      .catch(() => {});
  }, [search, chatFilter]);

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  useEffect(() => {
    if (!selectedContactId) return;
    fetch(`/api/chat/messages/${selectedContactId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setActiveContact(d.contact ?? null);
        refreshContacts();
      })
      .catch(() => {});
  }, [selectedContactId, refreshContacts]);

  useEffect(() => {
    if (!activeContact || !canAssign) return;
    const q = activeContact.vendorId
      ? `?vendorId=${encodeURIComponent(activeContact.vendorId)}`
      : "";
    fetch(`/api/chat/team${q}`)
      .then((r) => r.json())
      .then((d) => setTeamMembers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [activeContact?.id, canAssign]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pusher real-time
  useEffect(() => {
    if (!vendorUid) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-vendor-${vendorUid}`);
    channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (data: any) => {
      if (data.log?.contactId === selectedContactId) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.log.id) ? prev : [...prev, data.log],
        );
      }
      refreshContacts();
    });
    channel.bind(PUSHER_EVENTS.MESSAGE_STATUS, (data: any) => {
      if (data.waMessageId && data.status) {
        setMessages((prev) =>
          prev.map((m) =>
            m.waMessageId === data.waMessageId
              ? { ...m, status: data.status }
              : m,
          ),
        );
      }
    });
    channel.bind(PUSHER_EVENTS.CONTACT_UPDATE, () => refreshContacts());
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-vendor-${vendorUid}`);
    };
  }, [vendorUid, selectedContactId, refreshContacts]);

  /* ── File Selection ── */
  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    forceType?: MediaType,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Determine the media category: prefer forced type, fallback to mime sniff
    const category: MediaType = forceType ?? getMimeCategory(file.type);
    setSelectedFile(file);
    setSelectedFileType(category);
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
    // Reset the input value so the same file can be re-selected
    e.target.value = "";
  }

  function cancelFile() {
    setSelectedFile(null);
    setSelectedFileType("image");
    setFilePreview(null);
    setCaption("");
    // Clear all four inputs
    [imageInputRef, videoInputRef, audioInputRef, docInputRef].forEach(
      (ref) => {
        if (ref.current) ref.current.value = "";
      },
    );
  }

  /* ── Voice Recording ── */
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunks.current = [];
      mr.ondataavailable = (e) => audioChunks.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunks.current, {
          type: "audio/ogg; codecs=opus",
        });
        const file = new File([blob], "voice.ogg", { type: "audio/ogg" });
        stream.getTracks().forEach((t) => t.stop());
        await sendMedia(file, "audio");
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  }

  function stopRecording() {
    mediaRecorder?.stop();
    setRecording(false);
    setMediaRecorder(null);
  }

  /* ── Upload & Send Media ── */
  async function sendMedia(file: File, overrideType?: MediaType) {
    if (!selectedContactId) return;
    setUploading(true);
    setSending(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("contactId", selectedContactId);

    const uploadRes = await fetch("/api/chat/upload", {
      method: "POST",
      body: fd,
    });
    const uploadData = await uploadRes.json();
    setUploading(false);

    if (!uploadData.success) {
      alert(uploadData.error ?? "Upload failed.");
      setSending(false);
      cancelFile();
      return;
    }

    // Use explicit override → selectedFileType → mime sniff
    const type: MediaType =
      overrideType ?? selectedFileType ?? getMimeCategory(file.type);
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: selectedContactId,
        messageType: type,
        mediaId: uploadData.mediaId,
        caption: caption || undefined,
        fileName: file.name,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (data.success) {
      setMessages((prev) => [...prev, data.data]);
      cancelFile();
    } else {
      alert(data.error ?? "Failed to send media.");
    }
  }

  /* ── Send Text ── */
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFile) {
      await sendMedia(selectedFile);
      return;
    }
    if (!text.trim() || !selectedContactId || sending) return;
    setSending(true);
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: selectedContactId,
        messageType: "text",
        messageContent: text,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (data.success) {
      setText("");
      setMessages((prev) => [...prev, data.data]);
    } else {
      alert(data.error ?? "Failed to send message.");
    }
  }

  async function handleAssign(assignedUserId: string) {
    if (!activeContact || assigning) return;
    setAssigning(true);
    await fetch("/api/chat/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: activeContact.id,
        assignedUserId: assignedUserId || null,
      }),
    });
    setAssigning(false);
    const d = await fetch(`/api/chat/messages/${activeContact.id}`).then((r) =>
      r.json(),
    );
    setActiveContact(d.contact ?? null);
    refreshContacts();
  }

  async function handleClearChat() {
    if (!activeContact) return;
    setClearing(true);
    const res = await fetch(`/api/chat/clear?contactId=${activeContact.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setClearing(false);
    setClearConfirm(false);
    if (data.success) {
      setMessages([]);
      refreshContacts();
    } else {
      alert(data.error ?? "Failed to clear chat.");
    }
  }

  const contactName = (c: any) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || c.waId;

  /* ── Group messages by date ── */
  const messagesWithDates = messages.reduce<
    Array<{ type: "date" | "msg"; date?: string; msg?: any }>
  >((acc, msg, i) => {
    const prev = messages[i - 1];
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      acc.push({ type: "date", date: formatDate(msg.createdAt) });
    }
    acc.push({ type: "msg", msg });
    return acc;
  }, []);

  const filterLabels: { key: ChatFilter; label: string }[] = [
    { key: "all", label: tr("All", "الكل") },
    { key: "unread", label: tr("Unread", "غير المقروء") },
    { key: "mine", label: tr("Mine", "الخاص بي") },
    { key: "unassigned", label: tr("Unassigned", "غير المسند") },
  ];

  return (
    <div className="flex h-full rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
      {/* ── Contacts Sidebar ── */}
      <div className="w-72 bg-white border-e border-slate-100 flex flex-col flex-shrink-0">
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 mb-3 text-base">
            💬 {t("recentChats")}
          </h2>
          {/* Filter pills */}
          <div className="flex flex-wrap gap-1 mb-3">
            {filterLabels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChatFilter(key)}
                className={cn(
                  "text-xs rounded-full px-3 py-1 font-medium transition-colors",
                  chatFilter === key
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 border border-slate-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder={tc("search") + "…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {contacts.length} conversation{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              <p className="text-3xl mb-2">📭</p>
              <p>No conversations yet</p>
            </div>
          )}
          {contacts.map((c) => {
            const name = contactName(c);
            const lastMsg = c.messageLogs?.[0];
            const isSelected = selectedContactId === c.id;
            const time = lastMsg?.createdAt
              ? formatTime(lastMsg.createdAt)
              : "";
            const preview =
              lastMsg?.messageType === "text"
                ? lastMsg.messageContent
                : lastMsg?.messageType === "image"
                  ? "📷 Image"
                  : lastMsg?.messageType === "video"
                    ? "🎥 Video"
                    : lastMsg?.messageType === "audio"
                      ? "🎵 Audio"
                      : lastMsg?.messageType === "document"
                        ? "📎 Document"
                        : lastMsg?.messageType === "template"
                          ? "📋 Template"
                          : c.waId;

            return (
              <button
                key={c.id}
                onClick={() => router.push(`/chat/${c.id}`)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/60 transition-colors text-start border-b border-slate-50",
                  isSelected && "bg-emerald-50 border-l-2 border-l-emerald-500",
                )}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                      isSelected
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    {getInitials(c.firstName ?? c.waId, c.lastName)}
                  </div>
                  {c.unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold min-w-[18px] h-[18px] px-1">
                      {c.unreadMessagesCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        c.unreadMessagesCount > 0
                          ? "text-slate-900 font-semibold"
                          : "text-slate-700",
                      )}
                    >
                      {name}
                    </p>
                    {time && (
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {time}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-xs truncate mt-0.5",
                      c.unreadMessagesCount > 0
                        ? "text-slate-700 font-medium"
                        : "text-slate-400",
                    )}
                  >
                    {lastMsg && !lastMsg.isIncomingMessage && (
                      <span className="text-emerald-500 mr-0.5">✓</span>
                    )}
                    {preview}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat Window ── */}
      <div
        className="flex-1 flex flex-col"
        style={{
          background:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dcfce7' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\"), linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
        }}
      >
        {!selectedContactId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 bg-emerald-100 rounded-full mx-auto flex items-center justify-center text-5xl">
                💬
              </div>
              <p className="text-slate-500 font-medium">{t("selectContact")}</p>
              <p className="text-slate-400 text-sm">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className="bg-white/90 backdrop-blur-sm border-b border-slate-100 px-5 py-3 flex items-center gap-3 shadow-sm">
              {activeContact ? (
                <>
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {getInitials(
                      activeContact.firstName ?? activeContact.waId,
                      activeContact.lastName,
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">
                      {contactName(activeContact)}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {activeContact.waId}
                    </p>
                  </div>

                  {canAssign && (
                    <select
                      value={activeContact.assignedUserId ?? ""}
                      disabled={assigning}
                      onChange={(e) => handleAssign(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">{t("unassigned")}</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {[m.firstName, m.lastName]
                            .filter(Boolean)
                            .join(" ") || m.email}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* 3-Dot menu */}
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((o) => !o)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors text-lg font-bold"
                      title="More options"
                    >
                      ⋮
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-52 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setShowTemplateModal(true);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <span>📋</span>
                          <span className="text-start">
                            Send Template Message
                          </span>
                        </button>
                        {isAdmin && (
                          <>
                            <div className="h-px bg-slate-100 mx-3" />
                            <button
                              onClick={() => {
                                setMenuOpen(false);
                                setClearConfirm(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <span>🗑️</span>
                              <span>Clear Chat History</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-10 flex items-center">
                  <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
              )}
            </div>

            {/* ── Messages Area ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400 text-sm">
                    <p className="text-3xl mb-2">👋</p>
                    <p>No messages yet</p>
                    <p className="text-xs mt-1">
                      Send a message to start the conversation
                    </p>
                  </div>
                </div>
              )}

              {messagesWithDates.map((item, idx) => {
                if (item.type === "date") {
                  return (
                    <div
                      key={`date-${idx}`}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[11px] text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 font-medium shadow-sm">
                        {item.date}
                      </span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  );
                }
                const msg = item.msg!;
                const isOut = !msg.isIncomingMessage;
                const isText = msg.messageType === "text";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isOut ? "justify-end" : "justify-start",
                      "mb-1",
                    )}
                  >
                    <div
                      className={cn(
                        "relative max-w-[70%] rounded-2xl px-3 py-2 shadow-sm",
                        isOut
                          ? "bg-emerald-500 text-white rounded-br-sm"
                          : "bg-white text-slate-800 rounded-bl-sm border border-slate-100",
                      )}
                    >
                      {isText ? (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.messageContent}
                        </p>
                      ) : (
                        <MediaPreview msg={msg} />
                      )}
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1",
                          isOut ? "justify-end" : "justify-start",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[10px]",
                            isOut ? "text-white/60" : "text-slate-400",
                          )}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                        {isOut && <MessageStatus status={msg.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ── File Preview Bar ── */}
            {selectedFile && (
              <div className="bg-white border-t border-slate-100 px-4 py-3">
                <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-3">
                  {/* Thumbnail / icon */}
                  {filePreview && selectedFileType === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreview}
                      alt="preview"
                      className="w-14 h-14 object-cover rounded-lg flex-shrink-0 shadow-sm"
                    />
                  )}
                  {filePreview && selectedFileType === "video" && (
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <video
                        src={filePreview}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xl drop-shadow">
                          ▶
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedFileType === "audio" && (
                    <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                      🎵
                    </div>
                  )}
                  {selectedFileType === "document" && (
                    <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                      📄
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          selectedFileType === "audio"
                            ? "bg-purple-100 text-purple-600"
                            : selectedFileType === "document"
                              ? "bg-blue-100 text-blue-600"
                              : selectedFileType === "video"
                                ? "bg-rose-100 text-rose-600"
                                : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        {selectedFileType}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    {/* Caption only for image, video, document — not audio */}
                    {selectedFileType !== "audio" && (
                      <input
                        className="w-full mt-1.5 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
                        placeholder="Add a caption…"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                      />
                    )}
                  </div>
                  <button
                    onClick={cancelFile}
                    className="text-slate-400 hover:text-red-500 text-lg leading-none flex-shrink-0 p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* ── Input Bar ── */}
            <form onSubmit={handleSend} className="bg-white border-t border-slate-100 px-3 py-2.5">
              <div className="flex items-center gap-2">

                {/* ── Pill input wrapper ── */}
                <div className="flex-1 flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200 focus-within:border-emerald-400 focus-within:bg-white transition-all min-w-0">

                  {/* Emoji picker trigger */}
                  <div className="relative flex-shrink-0" ref={emojiRef}>
                    <button
                      type="button"
                      onClick={() => { setShowEmojiPicker(p => !p); setShowAttachMenu(false); }}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-yellow-500 transition-colors rounded-full hover:bg-slate-200 text-lg leading-none"
                      title="Emoji"
                    >
                      &#x1F642;
                    </button>

                    {/* Emoji popup — emoji-mart (WhatsApp style) */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-10 left-0 z-30 drop-shadow-2xl">
                        <Picker
                          data={emojiData}
                          onEmojiSelect={(emoji: any) => {
                            setText(prev => prev + emoji.native);
                            textInputRef.current?.focus();
                            setShowEmojiPicker(false);
                          }}
                          theme="light"
                          set="native"
                          previewPosition="none"
                          skinTonePosition="none"
                          navPosition="bottom"
                          perLine={9}
                          maxFrequentRows={2}
                        />
                      </div>
                    )}
                  </div>

                  {/* Text input */}
                  <input
                    ref={textInputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={selectedFile ? `✉️ Ready to send ${selectedFileType}…` : t("typeMessage")}
                    disabled={!!selectedFile}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 disabled:opacity-60 min-w-0 py-1"
                  />

                  {/* Paperclip attach menu trigger */}
                  <div className="relative flex-shrink-0" ref={attachRef}>
                    <button
                      type="button"
                      onClick={() => { setShowAttachMenu(p => !p); setShowEmojiPicker(false); }}
                      className={cn(
                        "w-7 h-7 flex items-center justify-center transition-colors rounded-full hover:bg-slate-200",
                        showAttachMenu ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-emerald-600"
                      )}
                      title="Attach file"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>

                    {/* Attach popup — 2×2 grid */}
                    {showAttachMenu && (
                      <div className="absolute bottom-10 right-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-52">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Send attachment</p>
                        <div className="grid grid-cols-2 gap-2">

                          {/* Image */}
                          <label className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-all border border-emerald-100 hover:border-emerald-300">
                            <span className="text-2xl">📷</span>
                            <span className="text-[11px] font-semibold text-emerald-700">Image</span>
                            <input ref={imageInputRef} type="file" className="hidden" accept="image/*"
                              onChange={(e) => { handleFileSelect(e, "image"); setShowAttachMenu(false); }} />
                          </label>

                          {/* Video */}
                          <label className="flex flex-col items-center gap-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 cursor-pointer transition-all border border-rose-100 hover:border-rose-300">
                            <span className="text-2xl">🎬</span>
                            <span className="text-[11px] font-semibold text-rose-600">Video</span>
                            <input ref={videoInputRef} type="file" className="hidden" accept="video/*"
                              onChange={(e) => { handleFileSelect(e, "video"); setShowAttachMenu(false); }} />
                          </label>

                          {/* Audio */}
                          <label className="flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 cursor-pointer transition-all border border-purple-100 hover:border-purple-300">
                            <span className="text-2xl">🎵</span>
                            <span className="text-[11px] font-semibold text-purple-600">Audio</span>
                            <input ref={audioInputRef} type="file" className="hidden" accept="audio/*"
                              onChange={(e) => { handleFileSelect(e, "audio"); setShowAttachMenu(false); }} />
                          </label>

                          {/* Document */}
                          <label className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 cursor-pointer transition-all border border-blue-100 hover:border-blue-300">
                            <span className="text-2xl">📄</span>
                            <span className="text-[11px] font-semibold text-blue-600">Document</span>
                            <input ref={docInputRef} type="file" className="hidden"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                              onChange={(e) => { handleFileSelect(e, "document"); setShowAttachMenu(false); }} />
                          </label>

                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Mic when idle | Stop when recording | Send when text/file ready */}
                {!text.trim() && !selectedFile && !recording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 transition-all shadow-sm text-lg"
                    title="Record voice"
                  >
                    🎙️
                  </button>
                ) : recording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white animate-pulse shadow-lg shadow-red-200 text-lg"
                    title="Stop recording"
                  >
                    ⏹
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={sending || uploading}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 transition-all shadow-sm"
                    title="Send"
                  >
                    {sending || uploading ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 translate-x-0.5">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Recording indicator */}
              {recording && (
                <div className="flex items-center gap-2 mt-2 px-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-xs text-red-600 font-medium">Recording… tap ⏹ to stop and send</span>
                </div>
              )}
            </form>
          </>
        )}
      </div>

      {/* ── Template Modal ── */}
      {mounted && showTemplateModal && selectedContactId && (
        <TemplateModal
          contactId={selectedContactId}
          onClose={() => setShowTemplateModal(false)}
          onSent={(msg) => setMessages((prev) => [...prev, msg])}
        />
      )}

      {/* ── Clear Chat Confirm ── */}
      {mounted &&
        clearConfirm &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">🗑️</div>
                <h3 className="font-bold text-slate-800 text-lg">
                  Clear Chat History?
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  This will permanently delete <strong>all messages</strong> in
                  this conversation. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setClearConfirm(false)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearChat}
                  disabled={clearing}
                  className="flex-1 rounded-xl bg-red-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
                >
                  {clearing ? "Clearing…" : "Clear All Messages"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
