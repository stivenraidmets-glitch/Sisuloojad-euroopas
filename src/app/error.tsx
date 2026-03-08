"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error.message, error.digest);
  }, [error]);

  const hint = error.message?.trim() || "Tundmatu viga.";
  const showEnvHint =
    hint.includes("DATABASE") ||
    hint.includes("NEXTAUTH") ||
    hint.includes("secret") ||
    hint.includes("url") ||
    hint.includes("env");

  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
      <h1 className="text-xl font-semibold">Midagi läks valesti</h1>
      <p className="max-w-md text-center text-muted-foreground">
        {hint}
      </p>
      {showEnvHint && (
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Vercel: Project → Settings → Environment Variables. Sea <strong>DATABASE_URL</strong>,{" "}
          <strong>NEXTAUTH_SECRET</strong>, <strong>NEXTAUTH_URL</strong> (nt https://sisuloojad-euroopas.vercel.app, ilma / lõpust). Seejärel redeploy.
        </p>
      )}
      <p className="text-sm text-muted-foreground">Digest: {error.digest ?? "—"}</p>
      <Button onClick={() => reset()}>Proovi uuesti</Button>
    </div>
  );
}
