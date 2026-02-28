"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WheelModal } from "@/components/wheel/WheelModal";
import { Gift, Sparkles } from "lucide-react";

type WinningsState = {
  hasSpun: boolean;
  result: { type: string; value: number; redeemedAt: string | null } | null;
  hasPrize: boolean;
  isRedeemed: boolean;
  freePenaltyBalance?: number;
} | null;

export function SettingsView() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [winnings, setWinnings] = useState<WinningsState>(null);
  const [winningsLoading, setWinningsLoading] = useState(true);
  const [wheelOpen, setWheelOpen] = useState(false);

  const fetchWinnings = useCallback(() => {
    fetch("/api/user/winnings")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasSpun !== undefined) {
          setWinnings({
            hasSpun: data.hasSpun,
            result: data.result ?? null,
            hasPrize: data.hasPrize ?? false,
            isRedeemed: data.isRedeemed ?? false,
            freePenaltyBalance: data.freePenaltyBalance ?? 0,
          });
        }
      })
      .catch(() => setWinnings(null))
      .finally(() => setWinningsLoading(false));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.name !== undefined) setName(data.name ?? "");
        if (data.email) setEmail(data.email);
      })
      .catch(() => setMessage({ type: "error", text: "Profiili laadimine ebaõnnestus." }))
      .finally(() => setLoading(false));
    fetchWinnings();
  }, [status, fetchWinnings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "authenticated") return;
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, email: email.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Uuendamine ebaõnnestus." });
        return;
      }
      setMessage({ type: "success", text: "Profiil uuendatud." });
      if (session?.user?.email !== email.trim()) {
        await signOut({ redirect: false });
        router.push("/login?message=email_changed");
      }
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Laen…</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>Logi sisse, et muuta konto seadeid.</p>
        <a href="/login" className="text-primary underline hover:no-underline">Logi sisse</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konto seaded</CardTitle>
          <CardDescription className="text-xs">
            Muuda kasutajanime või e-maili. Vestluses kuvatakse kasutajanimi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`rounded-md border p-2 text-xs ${
                message.type === "success"
                  ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300"
                  : "border-destructive/50 bg-destructive/10 text-destructive"
              }`}
            >
              {message.text}
            </div>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground">Laen profiili…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rp-name" className="text-xs">Kasutajanimi</Label>
                <Input
                  id="rp-name"
                  type="text"
                  placeholder="Sinu nimi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  disabled={saving}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-email" className="text-xs">E-mail</Label>
                <Input
                  id="rp-email"
                  type="email"
                  placeholder="sinu@email.ee"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                  className="h-9 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  E-maili muutmisel logitakse välja.
                </p>
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={saving}>
                {saving ? "Salvestan…" : "Salvesta"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-primary" />
            Sinu võidud
          </CardTitle>
          <CardDescription className="text-xs">
            Loosiratta võidud. Kasuta poes või keeruta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {winningsLoading ? (
            <p className="text-sm text-muted-foreground">Laen…</p>
          ) : !winnings?.hasSpun ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-center text-xs text-muted-foreground">
                Sul on üks tasuta keerutus!
              </p>
              <Button onClick={() => setWheelOpen(true)} size="sm" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Keeruta ratast
              </Button>
            </div>
          ) : winnings.hasPrize && !winnings.isRedeemed ? (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium text-primary">
                {(winnings.freePenaltyBalance ?? 0) > 0 && `${winnings.freePenaltyBalance} tasuta karistust`}
                {(winnings.freePenaltyBalance ?? 0) === 0 && winnings.result?.type === "FREE_PENALTY" && "Tasuta karistus"}
                {winnings.result?.type === "HALF_OFF_PENALTY" && "50% soodustus"}
                {winnings.result?.type === "CREDITS" && `${winnings.result?.value ?? 0} krediiti`}
              </p>
              <p className="text-xs text-muted-foreground">
                {winnings.result?.type === "FREE_PENALTY" && "Vali poest karistus ja kasuta tasuta."}
                {winnings.result?.type === "HALF_OFF_PENALTY" && "Järgmine ost poole hinnaga."}
                {winnings.result?.type === "CREDITS" && "Krediidid on kontol."}
              </p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">Võite pole.</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {winnings.hasSpun && !winnings.hasPrize && "Seekord midagi ei tulnud."}
                {winnings.isRedeemed && "Oled võidu juba kasutanud."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <WheelModal open={wheelOpen} onOpenChange={setWheelOpen} onSpun={fetchWinnings} />
    </div>
  );
}
