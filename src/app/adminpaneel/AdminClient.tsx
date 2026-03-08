"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type CountryUnlockWithTeam = {
  id: string;
  countryCode: string;
  teamId: number;
  unlockedAt: string;
  team: { id: number; name: string; color: string };
};

type TeamRow = {
  id: number;
  name: string;
  color: string;
  totalDistanceKm: number;
};

type AdminClientProps = {
  initialRaceStatus: string;
  initialWheelConfig: string;
  initialUnlocks?: CountryUnlockWithTeam[];
};

export function AdminClient({
  initialRaceStatus,
  initialWheelConfig,
  initialUnlocks = [],
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

export { PenaltyActions };

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
  const [lat, setLat] = useState<number | null>(currentLat ?? 48.8566);
  const [lng, setLng] = useState<number | null>(currentLng ?? 2.3522);
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

export { SetTeamLocation };

function ChatControls() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const clear = async (action: "clear-all" | "clear-from", minutesBack?: number) => {
    setLoading(action);
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "clear-from" ? { action: "clear-from", minutesBack: minutesBack ?? 5 } : { action: "clear-all" }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast({ title: action === "clear-all" ? "Vestlus tühjendatud." : `Kustutatud viimase ${minutesBack ?? 5} min sõnumeid.` });
    } catch {
      toast({ title: "Ebaõnnestus", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={!!loading} onClick={() => clear("clear-all")}>
        Tühjenda kogu vestlus
      </Button>
      <Button variant="outline" size="sm" disabled={!!loading} onClick={() => clear("clear-from", 5)}>
        Kustuta viimase 5 min sõnumid
      </Button>
    </div>
  );
}

export { ChatControls };

function TeamDistanceControls({ teams }: { teams: TeamRow[] }) {
  const [saving, setSaving] = useState<number | null>(null);
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(teams.map((t) => [t.id, String(t.totalDistanceKm)]))
  );
  const { toast } = useToast();

  const reset = async (teamId: number) => {
    setSaving(teamId);
    try {
      const res = await fetch("/api/admin/team-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, action: "reset" }),
      });
      if (!res.ok) throw new Error("Failed");
      setValues((prev) => ({ ...prev, [teamId]: "0" }));
      toast({ title: "Distants lähtestatud" });
    } catch {
      toast({ title: "Ebaõnnestus", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const setDistance = async (teamId: number) => {
    const raw = values[teamId] ?? "";
    const value = parseFloat(raw);
    if (Number.isNaN(value) || value < 0) {
      toast({ title: "Sisesta kehtiv number", variant: "destructive" });
      return;
    }
    setSaving(teamId);
    try {
      const res = await fetch("/api/admin/team-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, action: "set", value }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Distants uuendatud" });
    } catch {
      toast({ title: "Ebaõnnestus", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {teams.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center gap-2 rounded border p-3">
          <span className="font-medium">{t.name}</span>
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
          <span className="text-sm text-muted-foreground">Praegu: {t.totalDistanceKm.toFixed(1)} km</span>
          <input
            type="number"
            min={0}
            step={0.1}
            className="w-24 rounded border bg-background px-2 py-1 text-sm"
            value={values[t.id] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [t.id]: e.target.value }))}
          />
          <span className="text-sm text-muted-foreground">km</span>
          <Button size="sm" variant="outline" disabled={saving === t.id} onClick={() => setDistance(t.id)}>
            Sea väärtus
          </Button>
          <Button size="sm" variant="outline" disabled={saving === t.id} onClick={() => reset(t.id)}>
            Lähtesta
          </Button>
        </div>
      ))}
    </div>
  );
}

export { TeamDistanceControls };

function CountryUnlockControls({
  initialUnlocks,
  teams,
}: {
  initialUnlocks: CountryUnlockWithTeam[];
  teams: TeamRow[];
}) {
  const [unlocks, setUnlocks] = useState<CountryUnlockWithTeam[]>(initialUnlocks);
  const [countryCode, setCountryCode] = useState("");
  const [teamId, setTeamId] = useState<number>(teams[0]?.id ?? 1);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const { toast } = useToast();

  const assign = async () => {
    const code = countryCode.trim().toUpperCase().slice(0, 2);
    if (!code) {
      toast({ title: "Sisesta riigi kood (nt PL, EE)", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: code, teamId }),
      });
      if (!res.ok) throw new Error("Failed");
      await res.json();
      const team = teams.find((x) => x.id === teamId);
      setUnlocks((prev) => {
        const filtered = prev.filter((u) => u.countryCode !== code);
        return [...filtered, { id: "", countryCode: code, teamId, unlockedAt: new Date().toISOString(), team: team ? { id: team.id, name: team.name, color: team.color } : { id: teamId, name: "", color: "" } }].sort((a, b) => a.countryCode.localeCompare(b.countryCode));
      });
      setCountryCode("");
      toast({ title: `${code} määratud meeskonnale` });
    } catch {
      toast({ title: "Ebaõnnestus", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (code: string) => {
    setRemoving(code);
    try {
      const res = await fetch(`/api/admin/countries?countryCode=${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setUnlocks((prev) => prev.filter((u) => u.countryCode !== code));
      toast({ title: `${code} eemaldatud` });
    } catch {
      toast({ title: "Ebaõnnestus", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Riigi kood (PL, EE, DE...)"
          maxLength={2}
          className="w-32 rounded border bg-background px-2 py-1.5 text-sm uppercase"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
        />
        <select
          className="rounded border bg-background px-2 py-1.5 text-sm"
          value={teamId}
          onChange={(e) => setTeamId(Number(e.target.value))}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Button size="sm" disabled={saving || !countryCode.trim()} onClick={assign}>
          Lisa riik meeskonnale
        </Button>
      </div>
      <ul className="space-y-1.5 text-sm">
        {unlocks.map((u) => (
          <li key={u.countryCode} className="flex items-center justify-between rounded border px-2 py-1.5">
            <span><strong>{u.countryCode}</strong> → {u.team.name}</span>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.team.color }} />
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={removing === u.countryCode} onClick={() => remove(u.countryCode)}>
              Eemalda
            </Button>
          </li>
        ))}
        {unlocks.length === 0 && <li className="text-muted-foreground">Ühtegi riiki pole määratud.</li>}
      </ul>
    </div>
  );
}

export { CountryUnlockControls };
