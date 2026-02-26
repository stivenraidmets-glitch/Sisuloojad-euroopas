"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SignupContent() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [emailProviderAvailable, setEmailProviderAvailable] = useState<boolean | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  useEffect(() => {
    getProviders().then((p) => setEmailProviderAvailable(p?.email != null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    if (!trimmedEmail || !trimmedUsername) return;
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, username: trimmedUsername }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Midagi läks valesti.");
        return;
      }
      const signInRes = await signIn("email", {
        email: trimmedEmail,
        callbackUrl,
        redirect: false,
      });
      if (signInRes?.error) {
        setError("Magilinki ei saadetud. Kontrolli, et e-mail on õige.");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  const canSignup = emailProviderAvailable === true;

  return (
    <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Card>
          <CardHeader>
            <CardTitle>Loo konto</CardTitle>
            <CardDescription>
              Sisesta kasutajanimi ja e-mail. Saadame sulle magilinki sisselogimiseks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canSignup && emailProviderAvailable !== null && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Registreerumine pole hetkel saadaval</p>
                <p className="mt-1 text-muted-foreground">
                  Magilink (e-mail) pole seadistatud. Admin peab lisama Vercelis <strong>EMAIL_SERVER</strong> ja <strong>EMAIL_FROM</strong>. Kasuta <Link href="/login" className="underline">sisselogimise lehte</Link> kui sul on juba konto.
                </p>
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {sent ? (
              <p className="text-sm text-muted-foreground">
                Kontrolli oma postkasti ({email}). Saatsime sulle sisselogimislingi. Klõpsa lingil, et sisse logida.
              </p>
            ) : canSignup ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Kasutajanimi</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="sinu nimi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    maxLength={100}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sina@näide.ee"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saadan…" : "Registreeru ja saada magilink"}
                </Button>
              </form>
            ) : null}
            <p className="text-center text-sm text-muted-foreground">
              Sul on juba konto?{" "}
              <Link href={`/login${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="underline hover:text-foreground">
                Logi sisse
              </Link>
              {" · "}
              <Link href="/" className="underline hover:text-foreground">
                Tagasi avalehele
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center">Laen…</div>}>
      <SignupContent />
    </Suspense>
  );
}
