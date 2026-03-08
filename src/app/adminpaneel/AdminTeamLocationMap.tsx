"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const MAP_CENTER: [number, number] = [13.4, 52.5];
const MAP_ZOOM = 4;
const MARKER_SIZE_PX = 36;
const DEFAULT_POSITIONS: Record<number, [number, number]> = {
  1: [-3.7038, 40.4168], // Madrid, Spain (start)
  2: [24.7536, 59.437],  // Tallinn
};

function getTeamImageUrl(teamId: number, imageUrl?: string | null): string {
  if (imageUrl) return imageUrl;
  return teamId === 1 ? "/team1.png" : "/team2.png";
}

export type TeamForLocation = {
  id: number;
  name: string;
  color: string;
  imageUrl?: string | null;
  lastLat: number | null;
  lastLng: number | null;
};

export function TeamLocationMapWithControls({ teams }: { teams: TeamForLocation[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const [positions, setPositions] = useState<Record<number, { lat: number; lng: number }>>(() =>
    Object.fromEntries(
      teams.map((t) => [
        t.id,
        {
          lat: t.lastLat ?? DEFAULT_POSITIONS[t.id]?.[1] ?? 40.4168,
          lng: t.lastLng ?? DEFAULT_POSITIONS[t.id]?.[0] ?? -3.7038,
        },
      ])
    )
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [loadingLive, setLoadingLive] = useState<number | null>(null);
  const { toast } = useToast();

  const setLocation = useCallback(
    async (teamId: number) => {
      const pos = positions[teamId];
      if (!pos) return;
      setSaving(teamId);
      try {
        const res = await fetch("/api/admin/team-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, lat: pos.lat, lng: pos.lng }),
        });
        if (!res.ok) throw new Error("Failed");
        const team = teams.find((t) => t.id === teamId);
        toast({ title: `${team?.name ?? "Team"} asukoht uuendatud. Kaart uuendub otseülekanne.` });
      } catch {
        toast({ title: "Salvestamine ebaõnnestus", variant: "destructive" });
      } finally {
        setSaving(null);
      }
    },
    [positions, teams, toast]
  );

  const useLastBroadcasted = useCallback(
    async (teamId: number) => {
      setLoadingLive(teamId);
      try {
        const res = await fetch("/api/teams");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const team = Array.isArray(data) ? data.find((t: { id: number }) => t.id === teamId) : null;
        const lat = team?.lastLat ?? null;
        const lng = team?.lastLng ?? null;
        if (lat == null || lng == null) {
          toast({ title: "Viimast otseülekande asukohta pole", variant: "destructive" });
          return;
        }
        setPositions((prev) => ({ ...prev, [teamId]: { lat, lng } }));
        const saveRes = await fetch("/api/admin/team-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, lat, lng }),
        });
        if (!saveRes.ok) throw new Error("Failed to save");
        const teamName = teams.find((t) => t.id === teamId)?.name ?? "Team";
        toast({ title: `${teamName} asukoht seatud viimase otseülekande järgi.` });
      } catch {
        toast({ title: "Ebaõnnestus", variant: "destructive" });
      } finally {
        setLoadingLive(null);
      }
    },
    [teams, toast]
  );

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !mapContainerRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    const markers = new Map<number, mapboxgl.Marker>();

    map.on("load", () => {
      teams.forEach((t) => {
        const pos = positions[t.id] ?? { lat: DEFAULT_POSITIONS[t.id]?.[1] ?? 40.4168, lng: DEFAULT_POSITIONS[t.id]?.[0] ?? -3.7038 };
        const el = document.createElement("div");
        el.style.width = `${MARKER_SIZE_PX}px`;
        el.style.height = `${MARKER_SIZE_PX}px`;
        el.style.borderRadius = "50%";
        el.style.overflow = "hidden";
        el.style.border = "2px solid #fff";
        el.style.background = "transparent";
        el.style.cursor = "grab";
        const img = document.createElement("img");
        img.src = getTeamImageUrl(t.id, t.imageUrl);
        img.alt = t.name;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        el.appendChild(img);

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([pos.lng, pos.lat])
          .addTo(map);

        marker.setDraggable(true);
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          setPositions((prev) => ({ ...prev, [t.id]: { lat: lngLat.lat, lng: lngLat.lng } }));
        });

        markers.set(t.id, marker);
      });
      markersRef.current = markers;
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    positions &&
      Object.entries(positions).forEach(([teamIdStr, pos]) => {
        const marker = markersRef.current.get(Number(teamIdStr));
        if (marker) marker.setLngLat([pos.lng, pos.lat]);
      });
  }, [positions]);

  return (
    <div className="space-y-4">
      <div
        ref={mapContainerRef}
        className="h-[320px] w-full overflow-hidden rounded-md border bg-muted/30"
        style={{ minHeight: 320 }}
      />
      <p className="text-xs text-muted-foreground">
        Lohista meeskonna pilti kaardil soovitud asukohale, seejärel vajuta „Sea asukoht”.
      </p>
      <div className="space-y-3">
        {teams.map((t) => {
          const pos = positions[t.id];
          return (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-2 rounded border p-3"
            >
              <span className="font-medium">{t.name}</span>
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              {pos && (
                <span className="text-sm text-muted-foreground">
                  {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                </span>
              )}
              <Button
                size="sm"
                disabled={saving !== null}
                onClick={() => setLocation(t.id)}
              >
                {saving === t.id ? "Salvestan…" : "Sea asukoht"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loadingLive !== null}
                onClick={() => useLastBroadcasted(t.id)}
              >
                {loadingLive === t.id ? "Laen…" : "Viimane otseülekande asukoht"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
