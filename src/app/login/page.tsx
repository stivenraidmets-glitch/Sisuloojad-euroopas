"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam = searchParams.get("error");
  const registered = searchParams.get("registered") === "1";
  const messageParam = searchParams.get("message");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        email: trimmed,
        password,
        callbackUrl,
        redirect: false,
      });
      if (res?.error) {
        setError("Vale e-mail või parool.");
        return;
      }
      if (res?.ok) {
        window.location.href = res.url ?? callbackUrl;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Card>
          <CardHeader>
            <CardTitle>Logi sisse</CardTitle>
            <CardDescription>Sisuloojad Euroopas — sisesta e-mail ja parool.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {registered && (
              <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
                Konto loodud. Logi nüüd sisse.
              </div>
            )}
            {messageParam === "email_changed" && (
              <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
                E-mail muudetud. Logi sisse uue e-maili ja parooliga.
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {errorParam && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Sisselogimine ebaõnnestus</p>
                <p className="mt-1 text-muted-foreground">
                  Kontrolli <strong>NEXTAUTH_URL</strong>, <strong>NEXTAUTH_SECRET</strong> ja{" "}
                  <strong>DATABASE_URL</strong> Vercelis.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logime sisse…" : "Logi sisse"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Pole veel kontot?{" "}
              <Link
                href={`/signup${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                className="underline hover:text-foreground"
              >
                Registreeru
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center">Laen…</div>}>
      <LoginContent />
    </Suspense>
  );
}
