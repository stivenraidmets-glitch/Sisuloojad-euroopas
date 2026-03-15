"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, MessageCircle, Smile, ImageIcon } from "lucide-react";
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

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (_) {}
  }, []);

  // Initial load and fallback polling (every 30s); real-time via Pusher below
  useEffect(() => {
    if (status !== "authenticated") return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [status, fetchMessages]);

  // Real-time new messages via Pusher (scales to many users without polling)
  useEffect(() => {
    if (status !== "authenticated" || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    let cleanup: (() => void) | undefined;
    import("pusher-js").then(({ default: Pusher }) => {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      });
      const channel = pusher.subscribe("race");
      const handler = (payload: { id?: string; body?: string; userName?: string; createdAt?: string }) => {
        const id = payload?.id;
        if (!id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === id)) return prev;
          return [...prev, { id, body: payload.body ?? "", userName: payload.userName ?? "", createdAt: payload.createdAt ?? new Date().toISOString() }];
        });
      };
      channel.bind("chat-message", handler);
      cleanup = () => {
        channel.unbind("chat-message", handler);
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

  async function sendGif(gifUrl: string) {
    if (sending) return;
    setGifOpen(false);
    setGifQuery("");
    setGifResults([]);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: gifUrl }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
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
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
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
            <li key={m.id} className="rounded-md bg-muted/50 px-2 py-1.5">
              <span className="font-medium text-muted-foreground">
                {m.userName}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">
                {new Date(m.createdAt).toLocaleTimeString("et-EE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
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
            </li>
          ))}
        </ul>
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
