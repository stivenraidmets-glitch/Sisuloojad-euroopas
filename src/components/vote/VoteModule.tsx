"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type VoteCounts = { team1: number; team2: number; total: number };

export function VoteModule({
  team1Name,
  team2Name,
}: {
  team1Name: string;
  team2Name: string;
}) {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<VoteCounts>({ team1: 0, team2: 0, total: 0 });
  const [voting, setVoting] = useState(false);
  const { toast } = useToast();

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/vote");
      if (res.ok) {
        const data = await res.json();
        setCounts({ team1: data.team1, team2: data.team2, total: data.total });
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchCounts();
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    import("pusher-js").then(({ default: Pusher }) => {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      });
      const channel = pusher.subscribe("race");
      channel.bind("votes-update", (data: VoteCounts) => setCounts(data));
      return () => {
        channel.unbind("votes-update");
        pusher.unsubscribe("race");
      };
    });
  }, []);

  const vote = async (teamId: number) => {
    if (status !== "authenticated") {
      toast({ title: "Palun logi sisse, et hääletada", variant: "destructive" });
      return;
    }
    setVoting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to vote");
      setCounts({ team1: data.team1, team2: data.team2, total: data.total });
      toast({ title: "Hääl salvestatud!" });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Hääletamine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setVoting(false);
    }
  };

  const p1 = counts.total ? (counts.team1 / counts.total) * 100 : 50;
  const p2 = counts.total ? (counts.team2 / counts.total) * 100 : 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kes võidab?</CardTitle>
        <CardDescription>
          {status === "authenticated"
            ? "Vali meeskond (saad häält hiljem muuta)"
            : "Logi sisse, et hääletada"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={voting || status !== "authenticated"}
            onClick={() => vote(1)}
          >
            {team1Name}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={voting || status !== "authenticated"}
            onClick={() => vote(2)}
          >
            {team2Name}
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{team1Name}: {counts.team1}</span>
            <span>{team2Name}: {counts.team2}</span>
          </div>
          <div className="flex gap-0.5">
            <motion.div
              className="h-3 rounded-l-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${p1}%` }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="h-3 rounded-r-full bg-red-500"
              initial={{ width: 0 }}
              animate={{ width: `${p2}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
