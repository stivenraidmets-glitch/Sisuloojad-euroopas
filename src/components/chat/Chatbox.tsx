"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  id: string;
  body: string;
  userEmail: string | null;
  createdAt: string;
};

export function Chatbox() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [status, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  if (status !== "authenticated") return null;

  return (
    <aside className="hidden h-[calc(100vh-3.5rem)] w-full flex-col border-l bg-card md:flex md:w-[320px] md:flex-shrink-0 md:sticky md:top-14">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-sm">Vestlus</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
          {messages.length === 0 && (
            <li className="text-muted-foreground py-4 text-center text-xs">
              Siin pole veel sõnumeid. Alusta vestlust!
            </li>
          )}
          {messages.map((m) => (
            <li key={m.id} className="rounded-md bg-muted/50 px-2 py-1.5">
              <span className="font-medium text-muted-foreground">
                {m.userEmail ?? "?"}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">
                {new Date(m.createdAt).toLocaleTimeString("et-EE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <p className="mt-0.5 break-words">{m.body}</p>
            </li>
          ))}
          <div ref={bottomRef} />
        </ul>
        <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t p-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Sõnum..."
            maxLength={500}
            className="flex-1 text-sm"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
