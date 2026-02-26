"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";

type PenaltyOption = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  priceCents: number;
  type: string;
  teamSpecific: boolean;
};

type PenaltyShopProps = {
  team1Name: string;
  team2Name: string;
  /** On team page: only show options to buy for this team */
  fixedTeamId?: number;
  fixedTeamName?: string;
};

export function PenaltyShop({
  team1Name,
  team2Name,
  fixedTeamId,
  fixedTeamName,
}: PenaltyShopProps) {
  const { data: session, status } = useSession();
  const [options, setOptions] = useState<PenaltyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [winnings, setWinnings] = useState<{
    hasPrize: boolean;
    result: { type: string } | null;
    isRedeemed: boolean;
  } | null>(null);
  const [redeemOptionId, setRedeemOptionId] = useState("");
  const [redeemTeamId, setRedeemTeamId] = useState<number>(fixedTeamId ?? 1);
  const [redeeming, setRedeeming] = useState(false);
  const { toast } = useToast();
  const singleTeam = fixedTeamId != null;
  const canRedeemFree =
    winnings?.hasPrize &&
    winnings?.result?.type === "FREE_PENALTY" &&
    !winnings?.isRedeemed;
  const hasHalfOff =
    winnings?.hasPrize &&
    winnings?.result?.type === "HALF_OFF_PENALTY" &&
    !winnings?.isRedeemed;

  const fetchWinnings = useCallback(() => {
    fetch("/api/user/winnings")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasSpun !== undefined)
          setWinnings({
            hasPrize: data.hasPrize ?? false,
            result: data.result ?? null,
            isRedeemed: data.isRedeemed ?? false,
          });
      })
      .catch(() => setWinnings(null));
  }, []);

  useEffect(() => {
    fetch("/api/penalties/options")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOptions(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchWinnings();
  }, [status, fetchWinnings]);

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

  const redeemFree = async () => {
    if (!redeemOptionId || !redeemTeamId) {
      toast({ title: "Vali karistus ja meeskond", variant: "destructive" });
      return;
    }
    setRedeeming(true);
    try {
      const res = await fetch("/api/penalties/redeem-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penaltyOptionId: redeemOptionId, teamId: redeemTeamId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Redeem failed");
      toast({ title: "Tasuta karistus kasutatud!" });
      fetchWinnings();
      setRedeemOptionId("");
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Kasutamine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Osta sekkumine</CardTitle>
        <CardDescription>
          {singleTeam && fixedTeamName
            ? `Osta karistus meeskonnale ${fixedTeamName}.`
            : "Saada meeskonnale karistus. Sina valid meeskonna."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasHalfOff && (
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            Sul on 50% soodustus – järgmine ost on poole hinnaga.
          </p>
        )}
        {canRedeemFree && options.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="mb-3 flex items-center gap-2 font-medium text-primary">
              <Gift className="h-4 w-4" />
              Kasuta tasuta karistust
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">Karistus</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={redeemOptionId}
                  onChange={(e) => setRedeemOptionId(e.target.value)}
                >
                  <option value="">Vali…</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </div>
              {!singleTeam && (
                <div className="min-w-[120px]">
                  <label className="mb-1 block text-xs text-muted-foreground">Meeskond</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={redeemTeamId}
                    onChange={(e) => setRedeemTeamId(Number(e.target.value))}
                  >
                    <option value={1}>{team1Name}</option>
                    <option value={2}>{team2Name}</option>
                  </select>
                </div>
              )}
              <Button
                size="sm"
                disabled={!redeemOptionId || redeeming}
                onClick={redeemFree}
              >
                {redeeming ? "Kasutan…" : "Kasuta tasuta"}
              </Button>
            </div>
          </div>
        )}
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
                {singleTeam && fixedTeamId != null ? (
                  <Button
                    size="sm"
                    disabled={status !== "authenticated" || buying !== null}
                    onClick={() => buy(opt.id, fixedTeamId)}
                  >
                    {buying === opt.id ? "Suunan…" : "Osta"}
                  </Button>
                ) : (
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
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
