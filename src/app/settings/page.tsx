"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
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
} | null;

export default function SettingsPage() {
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
          });
        }
      })
      .catch(() => setWinnings(null))
      .finally(() => setWinningsLoading(false));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/settings");
      return;
    }
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
  }, [status, router, fetchWinnings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      setMessage({ type: "success", text: "Profiil uuendatud. Muudatused on kohe näha (värskenda lehte kui vaja)." });
      if (session?.user?.email !== email.trim()) {
        await signOut({ redirect: false });
        router.push("/login?message=email_changed");
        return;
      }
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <p className="text-muted-foreground">Laen…</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Konto seaded</CardTitle>
            <CardDescription>
              Muuda oma kasutajanime või e-maili. Vestluses kuvatakse kasutajanimi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div
                className={`rounded-md border p-3 text-sm ${
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Kasutajanimi</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Sinu nimi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sinu@email.ee"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Kui muudad e-maili, logitakse sind välja ja pead uue e-mailiga uuesti sisse logima.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvestan…" : "Salvesta muudatused"}
                </Button>
              </form>
            )}
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/" className="underline hover:text-foreground">
                Tagasi avalehele
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Sinu võidud
            </CardTitle>
            <CardDescription>
              Loosiratta võidud. Kasuta poes või keeruta, kui sa pole veel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {winningsLoading ? (
              <p className="text-sm text-muted-foreground">Laen…</p>
            ) : !winnings?.hasSpun ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-center text-sm text-muted-foreground">
                  Sul on üks tasuta keerutus. Võida tasuta karistus või 50% soodustus!
                </p>
                <Button onClick={() => setWheelOpen(true)} size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Keeruta ratast
                </Button>
              </div>
            ) : winnings.hasPrize && !winnings.isRedeemed ? (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="font-medium text-primary">
                  {winnings.result?.type === "FREE_PENALTY" && "Tasuta karistus"}
                  {winnings.result?.type === "HALF_OFF_PENALTY" && "50% soodustus järgmisele karistusele"}
                  {winnings.result?.type === "CREDITS" && `${winnings.result?.value ?? 0} krediiti`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {winnings.result?.type === "FREE_PENALTY" && "Vali poest karistus ja kasuta tasuta."}
                  {winnings.result?.type === "HALF_OFF_PENALTY" && "Järgmine ost on poole hinnaga."}
                  {winnings.result?.type === "CREDITS" && "Krediidid on kontol kasutatavad."}
                </p>
                <Button asChild variant="default" className="w-full">
                  <Link href="/">Kasuta poes</Link>
                </Button>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-muted-foreground">Võite pole.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {winnings.hasSpun && !winnings.hasPrize && "Seekord midagi ei tulnud."}
                  {winnings.isRedeemed && "Oled oma võidu juba kasutanud."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WheelModal
        open={wheelOpen}
        onOpenChange={setWheelOpen}
        onSpun={fetchWinnings}
      />
    </div>
  );
}
