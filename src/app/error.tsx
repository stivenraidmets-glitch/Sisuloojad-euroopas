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

  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12">
      <h1 className="text-xl font-semibold">Midagi läks valesti</h1>
      <p className="max-w-md text-center text-muted-foreground">
        Serveri viga. Kontrolli, et Vercel-is on seadistatud: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL.
      </p>
      <p className="text-sm text-muted-foreground">Digest: {error.digest ?? "—"}</p>
      <Button onClick={() => reset()}>Proovi uuesti</Button>
    </div>
  );
}
