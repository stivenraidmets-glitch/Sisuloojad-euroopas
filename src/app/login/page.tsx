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

const devLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "1";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await signIn("email", {
        email: email.trim(),
        callbackUrl,
        redirect: false,
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin() {
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: "test@test.com",
        password: "dev",
        callbackUrl,
        redirect: false,
      });
      if (res?.url) window.location.href = res.url;
      else if (res?.error) alert("Sisselogimine ebaõnnestus. Kasuta test@test.com / dev");
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
            <CardDescription>
              {devLoginEnabled
                ? "Kasuta allolevat nuppu kiirkatsetuseks või saada magilink."
                : "Sisesta oma e-mail. Saadame sulle magilinki."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {devLoginEnabled && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                <p className="mb-2 text-sm font-medium">Kiirsisse (ainult lokaalselt)</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={loading}
                  onClick={handleDevLogin}
                >
                  Logi sisse kui test@test.com
                </Button>
              </div>
            )}
            {sent ? (
              <p className="text-sm text-muted-foreground">
                Kontrolli oma postkasti sisselogimislinki järele. Võid pärast
                klõpsamist selle vaheala sulgeda.
              </p>
            ) : (
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saadan…" : "Saada magilink"}
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
