"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type TeamOption = { id: number; name: string; color: string };
type VoteCounts = { countsByTeam: Record<number, number>; total: number };

export function VoteModule({
  teams,
}: {
  teams: TeamOption[];
}) {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<VoteCounts>({ countsByTeam: {}, total: 0 });
  const [voting, setVoting] = useState(false);
  const { toast } = useToast();

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/vote");
      if (res.ok) {
        const data = await res.json();
        setCounts({ countsByTeam: data.countsByTeam ?? {}, total: data.total ?? 0 });
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
      setCounts({ countsByTeam: data.countsByTeam ?? {}, total: data.total ?? 0 });
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
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <Button
              key={team.id}
              variant="outline"
              className="flex-1"
              disabled={voting || status !== "authenticated"}
              onClick={() => vote(team.id)}
            >
              {team.name}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          {teams.map((team) => {
            const count = counts.countsByTeam[team.id] ?? 0;
            const percent = counts.total ? (count / counts.total) * 100 : 0;
            return (
              <div key={team.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{team.name}: {count}</span>
                  <span className="text-muted-foreground">{percent.toFixed(0)}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${percent}%`, backgroundColor: team.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
