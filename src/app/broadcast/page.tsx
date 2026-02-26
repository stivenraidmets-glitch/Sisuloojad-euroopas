"use client";

import { Suspense, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const BROADCAST_INTERVAL_MS = 30000; // 30 seconds

function BroadcastContent() {
  const [teamId, setTeamId] = useState<1 | 2>(1);
  const [sharing, setSharing] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchParams = useSearchParams();
  const secretFromUrl = (searchParams.get("secret") ?? "").trim();
  const { toast } = useToast();

  const secretToSend =
    secretFromUrl || (process.env.NEXT_PUBLIC_BROADCAST_SECRET || "").trim() || "broadcast";

  const sendLocation = useCallback(
    (lat: number, lng: number) => {
      fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          teamId,
          secret: secretToSend,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (res.ok) setLastSent(new Date());
          else toast({ title: (data as { error?: string }).error || "Saatmine ebaõnnestus", variant: "destructive" });
        })
        .catch(() => toast({ title: "Võrgu viga. Kontrolli ühendust.", variant: "destructive" }));
    },
    [teamId, secretToSend, toast]
  );

  const startSharing = () => {
    if (!navigator.geolocation) {
      toast({ title: "Asukoha jagamine pole toetatud", variant: "destructive" });
      return;
    }
    setSharing(true);
    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => toast({ title: "Asukohta ei saadud", variant: "destructive" })
      );
    };
    tick();
    intervalRef.current = setInterval(tick, BROADCAST_INTERVAL_MS);
  };

  const stopSharing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSharing(false);
  };

  return (
    <div className="container max-w-md space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Meeskonna asukoha jagamine</CardTitle>
          <CardDescription>
            Jaga oma meeskonna asukohta. Kaitse seda lehte jagatud salasõnaga.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Meeskond</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={teamId}
              onChange={(e) => setTeamId(parseInt(e.target.value, 10) as 1 | 2)}
              disabled={sharing}
            >
              <option value={1}>Kozip</option>
              <option value={2}>Stiven ja Sidni</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground">
            {secretFromUrl
              ? `Salasõna URL-is: ${secretFromUrl}`
              : "Kasutatakse vaikimisi salasõna (broadcast). Võid lisada URL-i ?secret=broadcast."}
          </p>
          {sharing ? (
            <Button variant="destructive" onClick={stopSharing} className="w-full">
              Lõpeta jagamine
            </Button>
          ) : (
            <Button onClick={startSharing} className="w-full">
              Alusta asukoha jagamist
            </Button>
          )}
          {lastSent && (
            <p className="text-sm text-muted-foreground">
              Viimati saadetud: {lastSent.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BroadcastPage() {
  return (
    <Suspense fallback={<div className="container max-w-md px-4 py-8">Laen…</div>}>
      <BroadcastContent />
    </Suspense>
  );
}
