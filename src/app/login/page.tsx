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

const devLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "1";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailProviderAvailable, setEmailProviderAvailable] = useState<boolean | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam = searchParams.get("error");

  useEffect(() => {
    getProviders().then((p) => setEmailProviderAvailable(p?.email != null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await signIn("email", {
        email: email.trim(),
        callbackUrl,
        redirect: false,
      });
      if (res?.error) setSent(false);
      else setSent(true);
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
              {emailProviderAvailable === false
                ? "Magilink pole seadistatud. Lisa Vercelis EMAIL_SERVER ja EMAIL_FROM (vt allpool) või kasuta kiirsisselogimist."
                : devLoginEnabled
                  ? "Kasuta allolevat nuppu kiirkatsetuseks või saada magilink."
                  : "Sisesta oma e-mail. Saadame sulle magilinki."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorParam && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Sisselogimine ebaõnnestus</p>
                <p className="mt-1 text-muted-foreground">
                  Kontrolli Vercelis: <strong>NEXTAUTH_URL</strong> = https://sisuloojad-euroopas.vercel.app (ilma lõpuslashita),
                  <strong> NEXTAUTH_SECRET</strong> on seatud, <strong>DATABASE_URL</strong> on õige. Seejärel redeploy. Kui kasutad magilinki, taotle uus link pärast seadeid.
                </p>
              </div>
            )}
            {devLoginEnabled && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                <p className="mb-2 text-sm font-medium">Kiirsisse (test@test.com / dev)</p>
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
            {emailProviderAvailable === false && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Magilink vajab seadistamist</p>
                <p className="mt-1 text-muted-foreground">
                  Vercel → Settings → Environment Variables. Lisa <strong>EMAIL_SERVER</strong> (nt Resend SMTP: <code className="text-xs">smtp://resend:RESEND_API_KEY@smtp.resend.com:465</code>) ja <strong>EMAIL_FROM</strong> (saatja aadress). Seejärel redeploy.
                </p>
              </div>
            )}
            {sent ? (
              <p className="text-sm text-muted-foreground">
                Kontrolli oma postkasti sisselogimislinki järele. Võid pärast
                klõpsamist selle vaheala sulgeda.
              </p>
            ) : emailProviderAvailable !== false ? (
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
            ) : null}
            <p className="text-center text-sm text-muted-foreground">
              Pole veel kontot?{" "}
              <Link href={`/signup${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="underline hover:text-foreground">
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
