"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type AdminClientProps = {
  initialRaceStatus: string;
  initialWheelConfig: string;
};

export function AdminClient({
  initialRaceStatus,
  initialWheelConfig,
}: AdminClientProps) {
  const [raceStatus, setRaceStatus] = useState(initialRaceStatus);
  const [wheelConfig, setWheelConfig] = useState(initialWheelConfig);
  const [savingRace, setSavingRace] = useState(false);
  const [savingWheel, setSavingWheel] = useState(false);
  const { toast } = useToast();

  const saveRaceStatus = async () => {
    setSavingRace(true);
    try {
      const res = await fetch("/api/admin/race-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: raceStatus }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Võistluse olek uuendatud" });
    } catch {
      toast({ title: "Salvestamine ebaõnnestus", variant: "destructive" });
    } finally {
      setSavingRace(false);
    }
  };

  const saveWheelConfig = async () => {
    setSavingWheel(true);
    try {
      JSON.parse(wheelConfig);
    } catch {
      toast({ title: "Vigane JSON", variant: "destructive" });
      setSavingWheel(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/wheel-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomesJson: wheelConfig }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Ratta seaded uuendatud" });
    } catch {
      toast({ title: "Salvestamine ebaõnnestus", variant: "destructive" });
    } finally {
      setSavingWheel(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Võistluse olek</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <select
            className="w-full rounded-md border bg-background px-3 py-2"
            value={raceStatus}
            onChange={(e) => setRaceStatus(e.target.value)}
          >
            <option value="pre-race">Eelvõistlus</option>
            <option value="live">Otse</option>
            <option value="finished">Lõpetatud</option>
          </select>
          <Button onClick={saveRaceStatus} disabled={savingRace}>
            Salvesta
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ratta tulemused (JSON)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className="h-32 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            value={wheelConfig}
            onChange={(e) => setWheelConfig(e.target.value)}
          />
          <Button onClick={saveWheelConfig} disabled={savingWheel}>
            Salvesta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PenaltyActions({
  penaltyId,
  status,
}: {
  penaltyId: string;
  status: string;
}) {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/penalty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penaltyId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Uuendatud" });
      window.location.reload();
    } catch {
      toast({ title: "Ebaõnnestus", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex gap-1">
      {status !== "ACTIVE" && (
        <Button
          size="sm"
          variant="outline"
          disabled={updating}
          onClick={() => updateStatus("ACTIVE")}
        >
          Märgi aktiivseks
        </Button>
      )}
      {status !== "COMPLETED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={updating}
          onClick={() => updateStatus("COMPLETED")}
        >
          Lõpeta
        </Button>
      )}
      {status !== "CANCELLED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={updating}
          onClick={() => updateStatus("CANCELLED")}
        >
          Tühista
        </Button>
      )}
    </div>
  );
}

AdminClient.PenaltyActions = PenaltyActions;

function SetTeamLocation({
  teamId,
  teamName,
  currentLat,
  currentLng,
}: {
  teamId: number;
  teamName: string;
  currentLat: number | null;
  currentLng: number | null;
}) {
  const [lat, setLat] = useState(currentLat ?? 48.8566);
  const [lng, setLng] = useState(currentLng ?? 2.3522);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/team-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, lat: Number(lat), lng: Number(lng) }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `Meeskonna ${teamName} asukoht uuendatud` });
      window.location.reload();
    } catch {
      toast({ title: "Salvestamine ebaõnnestus", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 text-sm">
      <label className="flex flex-col gap-0.5">
        <span className="text-muted-foreground">Laius</span>
        <input
          type="number"
          step="any"
          className="w-24 rounded border bg-background px-2 py-1"
          value={lat ?? ""}
          onChange={(e) => setLat(e.target.value === "" ? null : parseFloat(e.target.value))}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-muted-foreground">Pikkus</span>
        <input
          type="number"
          step="any"
          className="w-24 rounded border bg-background px-2 py-1"
          value={lng ?? ""}
          onChange={(e) => setLng(e.target.value === "" ? null : parseFloat(e.target.value))}
        />
      </label>
      <Button size="sm" onClick={save} disabled={saving}>
        Sea asukoht
      </Button>
    </div>
  );
}

AdminClient.SetTeamLocation = SetTeamLocation;
