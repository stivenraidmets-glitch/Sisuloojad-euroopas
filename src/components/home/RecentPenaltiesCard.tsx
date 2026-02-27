"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PenaltyItem = {
  id: string;
  title: string;
  teamName: string;
  buyerName: string;
  createdAt: string;
};

function formatMinutesAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "praegu";
  if (diff === 1) return "1 min tagasi";
  return `${diff} min tagasi`;
}

const RECENT_LIMIT = 5;

export function RecentPenaltiesCard({
  penalties: initialPenalties,
}: {
  penalties: PenaltyItem[];
}) {
  const [penalties, setPenalties] = useState(initialPenalties);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set(initialPenalties.map((p) => p.id)));
  const [, setTick] = useState(0);

  const fetchRecent = useCallback(() => {
    fetch(`/api/penalties/recent?limit=${RECENT_LIMIT}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const prevIds = prevIdsRef.current;
        const newIdsList = data.filter((p: PenaltyItem) => !prevIds.has(p.id)).map((p: PenaltyItem) => p.id);
        if (newIdsList.length > 0) {
          setNewIds(new Set(newIdsList));
          setTimeout(() => setNewIds(new Set()), 1500);
        }
        prevIdsRef.current = new Set(data.map((p: PenaltyItem) => p.id));
        setPenalties(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPenalties(initialPenalties);
    prevIdsRef.current = new Set(initialPenalties.map((p) => p.id));
  }, [initialPenalties]);

  useEffect(() => {
    window.addEventListener("checkout-success", fetchRecent);
    return () => window.removeEventListener("checkout-success", fetchRecent);
  }, [fetchRecent]);

  // Live update via Pusher when anyone buys
  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    let cleanup: (() => void) | undefined;
    import("pusher-js").then(({ default: Pusher }) => {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      });
      const channel = pusher.subscribe("race");
      channel.bind("penalty-update", fetchRecent);
      cleanup = () => {
        channel.unbind("penalty-update");
        pusher.unsubscribe("race");
      };
    });
    return () => cleanup?.();
  }, [fetchRecent]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Viimased karistused</CardTitle>
        <CardDescription>Hiljuti ostetud sekkumised (5 viimast)</CardDescription>
      </CardHeader>
      <CardContent>
        {penalties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Karistusi veel pole.</p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence mode="sync" initial={false}>
              {penalties.map((p, i) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={newIds.has(p.id) ? { opacity: 0, y: -12, scale: 0.96 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: newIds.has(p.id) ? 0.4 : 0.25,
                    layout: { duration: 0.2 },
                  }}
                  className={`flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm ${
                    newIds.has(p.id) ? "bg-primary/15 ring-1 ring-primary/30" : ""
                  }`}
                >
                  <span className="font-medium">
                    {p.title} → {p.teamName}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {p.buyerName} · {formatMinutesAgo(p.createdAt)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
