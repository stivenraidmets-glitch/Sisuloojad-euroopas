"use client";

import { useEffect, useState } from "react";

const PUSHER_CHANNEL = "race";
const PUSHER_EVENT_EVENT_TIMER = "event-timer-reset";

function formatElapsed(ms: number): string {
  if (ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function EventTimer() {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/event-timer")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.startedAt) setStartedAt(data.startedAt);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu";
    if (!key) return () => {};
    let cancelled = false;
    let cleanup: () => void = () => {};
    import("pusher-js").then(({ default: Pusher }) => {
      if (cancelled) return;
      const pusher = new Pusher(key, { cluster });
      const channel = pusher.subscribe(PUSHER_CHANNEL);
      const handler = (payload: { startedAt?: string }) => {
        if (payload?.startedAt) setStartedAt(payload.startedAt);
      };
      channel.bind(PUSHER_EVENT_EVENT_TIMER, handler);
      cleanup = () => {
        channel.unbind(PUSHER_EVENT_EVENT_TIMER, handler);
        pusher.unsubscribe(PUSHER_CHANNEL);
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) return null;

  return (
    <div className="rounded bg-background/90 px-2 py-1.5 text-xs font-medium backdrop-blur">
      <span className="text-muted-foreground">Võistlus kestab: </span>
      <span className="font-mono font-semibold text-primary">{formatElapsed(elapsed)}</span>
    </div>
  );
}
