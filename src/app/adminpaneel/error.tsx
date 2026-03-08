"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error.message, error.digest);
  }, [error]);

  const isProductionOmitted =
    error.message?.includes("omitted in production") ||
    error.message?.includes("Server Components render");

  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
      <h1 className="text-xl font-semibold">Halduspaneel – viga</h1>
      <p className="max-w-md text-center text-muted-foreground">
        {isProductionOmitted
          ? "Serveri viga lehe laadimisel. Enamasti põhjus: andmebaas või sisselogimise seaded."
          : (error.message?.trim() || "Tundmatu viga.")}
      </p>
      <div className="max-w-md space-y-2 text-center text-sm text-muted-foreground">
        <p>
          Kontrolli Vercelis (Settings → Environment Variables):
        </p>
        <ul className="list-inside list-disc text-left">
          <li><strong>DATABASE_URL</strong> – Neon connection string</li>
          <li><strong>NEXTAUTH_SECRET</strong> – peab olema seatud</li>
          <li><strong>NEXTAUTH_URL</strong> – https://sisuloojad-euroopas.vercel.app (ilma / lõpust)</li>
          <li><strong>ADMIN_EMAILS</strong> – sinu e-mail (komadega eraldatud)</li>
        </ul>
        <p>Seejärel tee redeploy ja proovi uuesti.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/login?callbackUrl=/adminpaneel">Logi sisse</Link>
        </Button>
        <Button onClick={() => reset()}>Proovi uuesti</Button>
      </div>
      <p className="text-xs text-muted-foreground">Digest: {error.digest ?? "—"}</p>
    </div>
  );
}
