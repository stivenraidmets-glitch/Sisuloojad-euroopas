"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type PenaltyOption = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  priceCents: number;
  type: string;
  teamSpecific: boolean;
};

export function PenaltyShop({
  team1Name,
  team2Name,
}: {
  team1Name: string;
  team2Name: string;
}) {
  const { data: session, status } = useSession();
  const [options, setOptions] = useState<PenaltyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/penalties/options")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOptions(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const buy = async (penaltyOptionId: string, teamId: number) => {
    if (status !== "authenticated") {
      toast({ title: "Palun logi sisse, et osta", variant: "destructive" });
      return;
    }
    setBuying(penaltyOptionId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penaltyOptionId, teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
      else toast({ title: "Suunan maksma…" });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Ost ebaõnnestus",
        variant: "destructive",
      });
      setBuying(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Osta sekkumine</CardTitle>
        <CardDescription>
          Saada meeskonnale karistus. Sina valid meeskonna.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Laeb…</p>
        ) : (
          <ul className="space-y-4">
            {options.map((opt) => (
              <motion.li
                key={opt.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  <p className="font-medium">{opt.title}</p>
                  {opt.description && (
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  )}
                  <p className="text-sm font-medium text-primary">
                    €{(opt.priceCents / 100).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={status !== "authenticated" || buying !== null}
                    onClick={() => buy(opt.id, 1)}
                  >
                    {team1Name}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={status !== "authenticated" || buying !== null}
                    onClick={() => buy(opt.id, 2)}
                  >
                    {team2Name}
                  </Button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
