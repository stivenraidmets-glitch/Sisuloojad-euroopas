"use client";

import { Button } from "@/components/ui/button";
import { ShoppingBag, Vote } from "lucide-react";

type ActivePenalty = {
  title: string;
  type: string;
  endsAt: string | null;
  durationMinutes: number;
};

type TeamMarkerPopupProps = {
  teamName: string;
  totalDistanceKm: number;
  activePenalty: ActivePenalty | null;
  onVote: () => Promise<void>;
  onBuyPunishment: () => void;
  formatRemaining?: (endsAt: string) => string;
};

export function TeamMarkerPopup({
  teamName,
  totalDistanceKm,
  activePenalty,
  onVote,
  onBuyPunishment,
  formatRemaining = (endsAt) => {
    const end = new Date(endsAt).getTime();
    const secs = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  },
}: TeamMarkerPopupProps) {
  return (
    <div className="min-w-[200px] max-w-[260px] rounded-lg border border-white/10 bg-card p-3 shadow-lg">
      <h3 className="font-semibold text-sm text-foreground">{teamName}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Läbitud: <span className="font-medium text-foreground">{totalDistanceKm.toFixed(1)} km</span>
      </p>
      {activePenalty ? (
        <p className="mt-2 text-xs text-muted-foreground">
          ❄️ Praegune karistus: {activePenalty.title}
          {activePenalty.endsAt ? (
            <span className="ml-1 font-medium">({formatRemaining(activePenalty.endsAt)})</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Praegune karistus: puudub</p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        <Button size="sm" variant="outline" className="w-full justify-center gap-1.5 text-xs" onClick={onBuyPunishment}>
          <ShoppingBag className="h-3.5 w-3.5" />
          Osta karistus
        </Button>
        <Button size="sm" className="w-full justify-center gap-1.5 text-xs" onClick={() => onVote()}>
          <Vote className="h-3.5 w-3.5" />
          Hääleta selle meeskonna poolt
        </Button>
      </div>
    </div>
  );
}
