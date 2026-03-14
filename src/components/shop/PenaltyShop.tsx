"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Gift, ShoppingCart } from "lucide-react";

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
  teams: { id: number; name: string; color?: string }[];
  /** On team page: only show options to buy for this team */
  fixedTeamId?: number;
  fixedTeamName?: string;
};

export function PenaltyShop({
  teams,
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
    freePenaltyBalance?: number;
  } | null>(null);
  const [redeemOptionId, setRedeemOptionId] = useState("");
  const [redeemTeamId, setRedeemTeamId] = useState<number>(fixedTeamId ?? teams[0]?.id ?? 1);
  const [redeeming, setRedeeming] = useState(false);
  const [chooseTeamOpen, setChooseTeamOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<PenaltyOption | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const { toast } = useToast();
  const singleTeam = fixedTeamId != null;
  const freeBalance = winnings?.freePenaltyBalance ?? 0;
  const canRedeemFree =
    freeBalance > 0 ||
    (winnings?.hasPrize &&
      winnings?.result?.type === "FREE_PENALTY" &&
      !winnings?.isRedeemed);
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
            freePenaltyBalance: data.freePenaltyBalance ?? 0,
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
      // Open popup immediately (same user gesture) to avoid popup blockers
      const w = window.open("", "stripe-checkout", "width=500,height=700,scrollbars=yes");
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penaltyOptionId, teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      const url = data.redirectUrl ?? data.url;
      if (url) {
        if (!w) {
          // Popup blocked – fall back to redirect
          window.location.href = url;
          return;
        }
        w.location.href = url;
        let checkClosed: ReturnType<typeof setInterval>;
        const onMessage = (e: MessageEvent) => {
          if (e.data?.type === "checkout-success" && e.data?.source === "sisuloojad") {
            window.removeEventListener("message", onMessage);
            clearInterval(checkClosed);
            setBuying(null);
            toast({ title: "Ost edukas! Karistus on aktiivne." });
            fetchWinnings();
            window.dispatchEvent(new CustomEvent("checkout-success"));
          }
        };
        window.addEventListener("message", onMessage);
        checkClosed = setInterval(() => {
          if (w?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener("message", onMessage);
            setBuying(null);
          }
        }, 500);
      } else {
        toast({ title: "Suunan maksma…" });
        setBuying(null);
      }
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Ost ebaõnnestus",
        variant: "destructive",
      });
      setBuying(null);
    }
  };

  const openChooseTeam = (opt: PenaltyOption) => {
    setSelectedOption(opt);
    setSelectedTeamId(teams[0]?.id ?? null);
    setChooseTeamOpen(true);
  };

  const confirmBuyForTeam = async () => {
    if (!selectedOption || selectedTeamId == null) return;
    await buy(selectedOption.id, selectedTeamId);
    setChooseTeamOpen(false);
    setSelectedOption(null);
    setSelectedTeamId(null);
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
              {freeBalance > 0 ? `${freeBalance} tasuta karistust` : "Kasuta tasuta karistust"}
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
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
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
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((opt) => (
              <Button
                key={opt.id}
                variant="outline"
                className="h-auto flex-col items-stretch gap-2 p-4 text-left"
                disabled={status !== "authenticated" || buying !== null}
                onClick={() =>
                  singleTeam && fixedTeamId != null
                    ? buy(opt.id, fixedTeamId)
                    : openChooseTeam(opt)
                }
              >
                <span className="font-medium">{opt.title}</span>
                {opt.description && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {opt.description}
                  </span>
                )}
                <span className="text-sm text-primary">
                  €{(opt.priceCents / 100).toFixed(2)} · {singleTeam ? "Osta" : "Vali meeskond"}
                </span>
              </Button>
            ))}
          </div>
        )}

        <Dialog open={chooseTeamOpen} onOpenChange={setChooseTeamOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Kellele soovid karistuse osta?</DialogTitle>
              <DialogDescription>
                {selectedOption ? (
                  <>
                    {selectedOption.title} — €{(selectedOption.priceCents / 100).toFixed(2)}
                  </>
                ) : (
                  "Vali meeskond"
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              {teams.map((team) => (
                <Button
                  key={team.id}
                  variant={selectedTeamId === team.id ? "default" : "outline"}
                  className="w-full justify-center"
                  onClick={() => setSelectedTeamId(team.id)}
                >
                  {team.name}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setChooseTeamOpen(false)}
              >
                Tühista
              </Button>
              <Button
                disabled={!selectedTeamId || buying !== null}
                onClick={confirmBuyForTeam}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {buying ? "Suunan…" : "Maksma"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
