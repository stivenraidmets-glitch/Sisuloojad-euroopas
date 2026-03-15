"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, MessageCircle, Smile, ImageIcon, MoreVertical, Trash2, Ban, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GIF_URL_HOSTS = [
  "giphy.com",
  "media.giphy.com",
  "i.giphy.com",
  "imgur.com",
  "i.imgur.com",
  "media.tenor.com",
  "tenor.com",
];
function isGifUrl(body: string): boolean {
  const s = body.trim();
  if (!s || s.length > 800) return false;
  try {
    const url = new URL(s);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (GIF_URL_HOSTS.some((h) => host === h || host.endsWith("." + h))) return true;
    if (url.pathname.toLowerCase().endsWith(".gif")) return true;
  } catch {
    return false;
  }
  return false;
}

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
  "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋",
  "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
  "😐", "😑", "😶", "😏", "😣", "😥", "😮", "🤐", "😯", "😪",
  "😫", "😴", "🤤", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵",
  "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "👍", "👎", "👏", "🙌",
  "🤝", "🙏", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🔥",
  "⭐", "🌟", "✨", "💫", "🎉", "🎊", "🏆", "✅", "❌", "⚠️",
];

type ChatMessage = {
  id: string;
  userId?: string;
  body: string;
  userName: string;
  createdAt: string;
};

type ChatboxProps = { embedded?: boolean };

type GifResult = { id: string; url: string; title: string };

export function Chatbox({ embedded }: ChatboxProps = {}) {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const messagesEndRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPopoverRef = useRef<HTMLDivElement>(null);
  const gifPopoverRef = useRef<HTMLDivElement>(null);
  const gifSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adminMenuMessageId, setAdminMenuMessageId] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [muteError, setMuteError] = useState<{ mutedUntil: string } | null>(null);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (_) {}
  }, []);

  // Initial load and fallback polling. If Pusher key is missing, poll every 5s; else 30s (Pusher does real-time).
  const pollIntervalMs = typeof process.env.NEXT_PUBLIC_PUSHER_KEY === "string" && process.env.NEXT_PUBLIC_PUSHER_KEY.length > 0 ? 30000 : 5000;
  useEffect(() => {
    if (status !== "authenticated") return;
    fetchMessages();
    const interval = setInterval(fetchMessages, pollIntervalMs);
    return () => clearInterval(interval);
  }, [status, fetchMessages, pollIntervalMs]);

  // Real-time new messages via Pusher (scales to many users without polling)
  useEffect(() => {
    if (status !== "authenticated" || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    let cleanup: (() => void) | undefined;
    import("pusher-js").then(({ default: Pusher }) => {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      });
      const channel = pusher.subscribe("race");
      const handler = (payload: { id?: string; userId?: string; body?: string; userName?: string; createdAt?: string }) => {
        const id = payload?.id;
        if (!id) return;
        const myId = (session?.user as { id?: string })?.id;
        if (myId && payload.userId === myId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === id)) return prev;
          return [...prev, { id, userId: payload.userId, body: payload.body ?? "", userName: payload.userName ?? "", createdAt: payload.createdAt ?? new Date().toISOString() }];
        });
      };
      channel.bind("chat-message", handler);
      const deletedHandler = (payload: { messageId?: string }) => {
        if (payload?.messageId) {
          setDeletedMessageIds((prev) => new Set(Array.from(prev).concat(payload.messageId!)));
        }
      };
      const bulkDeletedHandler = (payload: { messageIds?: string[] }) => {
        if (Array.isArray(payload?.messageIds) && payload.messageIds.length > 0) {
          const set = new Set(payload.messageIds);
          setMessages((prev) => prev.filter((m) => !set.has(m.id)));
        }
      };
      channel.bind("chat-message-deleted", deletedHandler);
      channel.bind("chat-messages-deleted", bulkDeletedHandler);
      cleanup = () => {
        channel.unbind("chat-message", handler);
        channel.unbind("chat-message-deleted", deletedHandler);
        channel.unbind("chat-messages-deleted", bulkDeletedHandler);
        pusher.unsubscribe("race");
      };
    });
    return () => cleanup?.();
  }, [status]);

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!emojiOpen) return;
    const close = (e: MouseEvent) => {
      if (
        emojiPopoverRef.current &&
        !emojiPopoverRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [emojiOpen]);

  // Close GIF popover when clicking outside
  useEffect(() => {
    if (!gifOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (gifPopoverRef.current && !gifPopoverRef.current.contains(target) && inputRef.current && !inputRef.current.contains(target)) {
        setGifOpen(false);
      }
    };
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [gifOpen]);

  // GIF: when popover opens show trending; when user types, debounced search
  useEffect(() => {
    if (!gifOpen) return;
    const q = gifQuery.trim();
    if (gifSearchTimeoutRef.current) clearTimeout(gifSearchTimeoutRef.current);
    const doFetch = () => {
      setGifSearching(true);
      const url = q ? `/api/chat/gif-search?q=${encodeURIComponent(q)}` : "/api/chat/gif-search";
      fetch(url)
        .then((res) => res.json())
        .then((data) => setGifResults(Array.isArray(data) ? data : []))
        .catch(() => setGifResults([]))
        .finally(() => setGifSearching(false));
    };
    if (q) {
      gifSearchTimeoutRef.current = setTimeout(doFetch, 300);
    } else {
      doFetch(); // trending when no query
    }
    return () => {
      if (gifSearchTimeoutRef.current) {
        clearTimeout(gifSearchTimeoutRef.current);
        gifSearchTimeoutRef.current = null;
      }
    };
  }, [gifOpen, gifQuery]);

  const isAdmin = !!session?.user?.isAdmin;

  function formatMuteTimeLeft(mutedUntil: string): string {
    const end = new Date(mutedUntil).getTime();
    const now = Date.now();
    if (end <= now) return "0 min";
    const min = Math.ceil((end - now) / 60_000);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  // Clear muteError when mute has expired
  useEffect(() => {
    if (!muteError) return;
    const end = new Date(muteError.mutedUntil).getTime();
    if (end <= Date.now()) {
      setMuteError(null);
      return;
    }
    const t = setInterval(() => {
      if (Date.now() >= end) {
        setMuteError(null);
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [muteError]);

  async function deleteMessage(messageId: string) {
    if (adminActionLoading) return;
    setAdminActionLoading(true);
    setAdminMenuMessageId(null);
    try {
      const res = await fetch(`/api/chat/${messageId}`, { method: "DELETE" });
      if (res.ok) setDeletedMessageIds((prev) => new Set(Array.from(prev).concat(messageId)));
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function timeoutUser(userId: string, duration: string) {
    if (adminActionLoading || !userId) return;
    setAdminActionLoading(true);
    setAdminMenuMessageId(null);
    try {
      await fetch("/api/chat/timeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, duration }),
      });
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function banUser(userId: string) {
    if (adminActionLoading || !userId) return;
    setAdminActionLoading(true);
    setAdminMenuMessageId(null);
    try {
      await fetch("/api/chat/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      // Pusher chat-messages-deleted will remove messages live for all clients
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function sendGif(gifUrl: string) {
    if (sending) return;
    setGifOpen(false);
    setGifQuery("");
    setGifResults([]);
    setSending(true);
    setMuteError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: gifUrl }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.mutedUntil) setMuteError({ mutedUntil: data.mutedUntil });
      }
    } finally {
      setSending(false);
    }
  }

  function insertEmoji(emoji: string) {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    setMuteError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.mutedUntil) setMuteError({ mutedUntil: data.mutedUntil });
        setInput(text);
      } else {
        setInput(text);
      }
    } finally {
      setSending(false);
    }
  }

  if (status !== "authenticated") {
    if (embedded) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>Logi sisse, et vestelda ja näha vestlust.</p>
          <a href="/login" className="text-primary underline hover:no-underline">Logi sisse</a>
        </div>
      );
    }
    return null;
  }

  const content = (
    <>
      {!embedded && (
        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Vestlus</h2>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ul ref={messagesEndRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
          {messages.length === 0 && (
            <li className="text-muted-foreground py-4 text-center text-xs">
              Siin pole veel sõnumeid. Alusta vestlust!
            </li>
          )}
          {messages.map((m) => (
            <li key={m.id} className="relative rounded-md bg-muted/50 px-2 py-1.5">
              {deletedMessageIds.has(m.id) ? (
                <p className="text-xs italic text-muted-foreground">
                  See sõnum on administraatori poolt kustutatud.
                </p>
              ) : (
                <>
              <div className="flex items-start justify-between gap-1">
                <div>
                  <span className="font-medium text-muted-foreground">
                    {m.userName}
                  </span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleTimeString("et-EE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {isAdmin && (
                  <div className="relative shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => setAdminMenuMessageId((id) => (id === m.id ? null : m.id))}
                      aria-label="Admin"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {adminMenuMessageId === m.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          aria-hidden
                          onClick={() => setAdminMenuMessageId(null)}
                        />
                        <div className="absolute right-0 top-full z-50 mt-0.5 min-w-[160px] rounded border bg-card py-1 shadow-lg">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                            onClick={() => deleteMessage(m.id)}
                            disabled={adminActionLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                            Kustuta sõnum
                          </button>
                          <div className="my-1 border-t px-2 py-1 text-xs font-medium text-muted-foreground">
                            Vaikiv (timeout)
                          </div>
                          {["1", "5", "15", "45", "60", "180", "1440", "lifetime"].map((d) => (
                            <button
                              key={d}
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs hover:bg-muted"
                              onClick={() => m.userId && timeoutUser(m.userId, d)}
                              disabled={adminActionLoading || !m.userId}
                            >
                              <Clock className="h-3 w-3" />
                              {d === "1" ? "1 min" : d === "60" ? "1 h" : d === "180" ? "3 h" : d === "1440" ? "24 h" : d === "lifetime" ? "Igavesti" : `${d} min`}
                            </button>
                          ))}
                          <div className="my-1 border-t" />
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                            onClick={() => m.userId && banUser(m.userId)}
                            disabled={adminActionLoading || !m.userId}
                          >
                            <Ban className="h-4 w-4" />
                            Keela vestlus
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-0.5">
                {isGifUrl(m.body) ? (
                  <a
                    href={m.body.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block max-w-full overflow-hidden rounded"
                  >
                    <img
                      src={m.body.trim()}
                      alt="GIF"
                      className="max-h-48 max-w-full rounded object-cover"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <p className="break-words">{m.body}</p>
                )}
              </div>
                </>
              )}
            </li>
          ))}
        </ul>
        {muteError && (
          <div className="shrink-0 border-t bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            Sa oled vaikiv. Aega jäänud: {formatMuteTimeLeft(muteError.mutedUntil)}
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative flex shrink-0 gap-2 border-t p-2">
          <div className="relative flex flex-1 items-center gap-1">
            <div className="relative" ref={emojiPopoverRef}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  setEmojiOpen((open) => !open);
                }}
                title="Emoji"
                aria-label="Lisa emoji"
              >
                <Smile className="h-5 w-5" />
              </Button>
              {emojiOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-1 max-h-48 w-72 overflow-y-auto rounded-lg border bg-card p-2 shadow-lg">
                  <div className="grid grid-cols-10 gap-0.5">
                    {EMOJI_LIST.map((emoji, i) => (
                      <button
                        key={i}
                        type="button"
                        className="rounded p-1.5 text-lg leading-none hover:bg-accent"
                        onClick={() => insertEmoji(emoji)}
                        aria-label={`Emoji ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Sõnum, emoji või GIF..."
              maxLength={800}
              className="flex-1 text-sm"
              disabled={sending}
            />
          </div>
          <div className="relative shrink-0" ref={gifPopoverRef}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                setGifOpen((open) => !open);
                if (!gifOpen) setGifQuery("");
              }}
              title="GIF"
              aria-label="Vali GIF"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            {gifOpen && (
              <div className="absolute bottom-full right-0 z-50 mb-1 flex w-72 flex-col rounded-lg border bg-card shadow-lg">
                <Input
                  placeholder="Otsi GIF-i..."
                  value={gifQuery}
                  onChange={(e) => setGifQuery(e.target.value)}
                  className="m-2 shrink-0"
                  autoFocus
                />
                <div className="max-h-56 overflow-y-auto p-2 pt-0">
                  {gifSearching && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Otsin...</p>
                  )}
                  {!gifSearching && !gifQuery.trim() && gifResults.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Laen...</p>
                  )}
                  {!gifSearching && gifQuery.trim() && gifResults.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Tulemusi ei leitud.</p>
                  )}
                  {!gifSearching && gifResults.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {gifResults.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className="overflow-hidden rounded border bg-muted/30 transition hover:opacity-90 focus:ring-2 focus:ring-ring"
                          onClick={() => sendGif(g.url)}
                        >
                          <img
                            src={g.url}
                            alt={g.title || "GIF"}
                            className="h-20 w-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button type="submit" size="icon" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );

  if (embedded) return content;
  return (
    <aside className="hidden h-[calc(100vh-3.5rem)] w-full flex-col border-l bg-card md:flex md:w-[320px] md:flex-shrink-0 md:sticky md:top-14">
      {content}
    </aside>
  );
}
