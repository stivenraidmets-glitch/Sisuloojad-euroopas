"use client";

import { Suspense, useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SignupContent() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const siteKey = useMemo(() => {
    const k = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
    if (k) return k;
    if (process.env.NODE_ENV === "development") return "1x00000000000000000000AA";
    return "";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();
    if (!trimmedEmail || !trimmedUsername || !password) return;
    if (password !== passwordAgain) {
      setError("Paroolid ei kattu.");
      return;
    }
    if (password.length < 8) {
      setError("Parool peab olema vähemalt 8 tähemärki.");
      return;
    }
    if (!siteKey) {
      setError("Turnstile pole seadistatud (NEXT_PUBLIC_TURNSTILE_SITE_KEY).");
      return;
    }
    if (!turnstileToken) {
      setError("Palun kinnita, et oled inimene (märgi kast allpool).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          username: trimmedUsername,
          password,
          turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Midagi läks valesti.");
        return;
      }

      const signInRes = await signIn("credentials", {
        email: trimmedEmail,
        password,
        callbackUrl,
        redirect: false,
      });
      if (signInRes?.url) {
        window.location.href = signInRes.url;
        return;
      }
      if (signInRes?.error) {
        window.location.href = `/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`;
        return;
      }
      window.location.href = callbackUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Card>
          <CardHeader>
            <CardTitle>Loo konto</CardTitle>
            <CardDescription>
              Sisuloojad Euroopas — kasutajanimi, e-mail ja parool. Kinnita, et oled inimene.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!siteKey && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Turnstile puudub</p>
                <p className="mt-1 text-muted-foreground">
                  Lisa Vercelisse <strong>NEXT_PUBLIC_TURNSTILE_SITE_KEY</strong> ja{" "}
                  <strong>TURNSTILE_SECRET_KEY</strong> (Cloudflare Turnstile). Arenduses kasutatakse testvõtmeid.
                </p>
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
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
              <div className="space-y-2">
                <Label htmlFor="password">Parool</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="vähemalt 8 tähemärki"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Parool uuesti</Label>
                <Input
                  id="password2"
                  type="password"
                  placeholder="korda parooli"
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {siteKey ? (
                <div className="flex min-h-[65px] justify-center">
                  <Turnstile
                    siteKey={siteKey}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                  />
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading || !siteKey}>
                {loading ? "Loome kontot…" : "Registreeru"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Sul on juba konto?{" "}
              <Link
                href={`/login${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                className="underline hover:text-foreground"
              >
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
