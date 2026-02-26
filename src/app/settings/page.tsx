"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
  }, [status, router]);

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
    <div className="container max-w-md px-4 py-8">
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
    </div>
  );
}
