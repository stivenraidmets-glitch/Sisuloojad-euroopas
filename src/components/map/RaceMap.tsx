"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TeamLocation } from "@/types";

const MAP_CENTER: [number, number] = [15.5, 52]; // Europe
const MAP_ZOOM = 4;
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const TEAMS_SOURCE_ID = "teams-points";
const TEAMS_LAYER_ID = "teams-circles";

// Default positions when no location has been broadcast yet (Paris → Tallinn race)
const DEFAULT_POSITIONS: Record<number, [number, number]> = {
  1: [48.8566, 2.3522],   // Paris
  2: [59.437, 24.7536],   // Tallinn
};

type ActivePenalty = {
  title: string;
  type: string;
  endsAt: string | null;
  durationMinutes: number;
};

type QueuedPenalty = {
  title: string;
  durationMinutes: number | null;
};

type TeamState = {
  teamId: number;
  name: string;
  color: string;
  lat: number;
  lng: number;
  lastUpdatedAt: Date | null;
  activePenalty: ActivePenalty | null;
  queuedPenalties: QueuedPenalty[];
};

type RaceMapProps = {
  teams: {
    id: number;
    name: string;
    color: string;
    lastLat: number | null;
    lastLng: number | null;
    lastUpdatedAt: Date | null;
    activePenalty?: ActivePenalty | null;
    queuedPenalties?: QueuedPenalty[];
  }[];
  channelName?: string;
  accessToken: string;
};

const FROZEN_COLOR = "#93c5fd"; // ice blue for active penalty

export function RaceMap({
  teams: initialTeams,
  channelName = "race",
  accessToken,
}: RaceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);

  const [teams, setTeams] = useState<TeamState[]>(
    initialTeams.map((t) => {
      const defaultPos = DEFAULT_POSITIONS[t.id];
      const hasBroadcast = t.lastLat != null && t.lastLng != null;
      return {
        teamId: t.id,
        name: t.name,
        color: t.color,
        lat: hasBroadcast ? t.lastLat! : (defaultPos?.[0] ?? 0),
        lng: hasBroadcast ? t.lastLng! : (defaultPos?.[1] ?? 0),
        lastUpdatedAt: t.lastUpdatedAt,
        activePenalty: t.activePenalty ?? null,
        queuedPenalties: t.queuedPenalties ?? [],
      };
    })
  );
  const [now, setNow] = useState(() => new Date());

  const initMap = useCallback(() => {
    if (!mapRef.current || !accessToken) return;
    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapInstance.current = map;
  }, [accessToken]);

  useEffect(() => {
    initMap();
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [initMap]);

  // Subscribe to realtime location updates (Pusher) when configured
  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    import("pusher-js").then(({ default: Pusher }) => {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      });
      const channel = pusher.subscribe(channelName);
      channel.bind("location-update", (data: TeamLocation) => {
        setTeams((prev) =>
          prev.map((t) =>
            t.teamId === data.teamId
              ? {
                  ...t,
                  lat: data.lat,
                  lng: data.lng,
                  lastUpdatedAt: new Date(data.lastUpdatedAt),
                }
              : t
          )
        );
      });
      return () => {
        channel.unbind("location-update");
        pusher.unsubscribe(channelName);
      };
    });
  }, [channelName]);

  // Poll for team locations: once soon, then every 30s (works without Pusher)
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch("/api/teams");
        if (!res.ok) return;
        const data = await res.json();
        setTeams((prev) =>
          prev.map((t) => {
            const fromApi = data.find((d: { id: number }) => d.id === t.teamId);
            const defaultPos = DEFAULT_POSITIONS[t.teamId];
            if (!fromApi) return t;
            const next = {
              ...t,
              activePenalty: fromApi.activePenalty ?? null,
              queuedPenalties: fromApi.queuedPenalties ?? [],
            };
            if (fromApi.lastLat != null && fromApi.lastLng != null) {
              return {
                ...next,
                lat: fromApi.lastLat,
                lng: fromApi.lastLng,
                lastUpdatedAt: fromApi.lastUpdatedAt
                  ? new Date(fromApi.lastUpdatedAt)
                  : t.lastUpdatedAt,
              };
            }
            return {
              ...next,
              lat: defaultPos?.[0] ?? t.lat,
              lng: defaultPos?.[1] ?? t.lng,
            };
          })
        );
      } catch (_) {}
    };
    const t0 = setTimeout(fetchTeams, 1500);
    const interval = setInterval(fetchTeams, 30000);
    return () => {
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, []);

  // Countdown ticker for penalty timers
  useEffect(() => {
    const hasActive = teams.some((t) => t.activePenalty != null);
    if (!hasActive) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [teams]);

  // Draw team positions as map layers – frozen teams get ice-blue circle
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    teams.forEach((t) => {
      const lat = t.lat;
      const lng = t.lng;
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180 ||
        (lat === 0 && lng === 0)
      )
        return;
      const isFrozen = t.activePenalty != null;
      features.push({
        type: "Feature",
        properties: {
          teamId: t.teamId,
          color: isFrozen ? FROZEN_COLOR : t.color,
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    });

    const applyData = () => {
      if (!map.getSource(TEAMS_SOURCE_ID)) {
        map.addSource(TEAMS_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });
        map.addLayer({
          id: TEAMS_LAYER_ID,
          type: "circle",
          source: TEAMS_SOURCE_ID,
          paint: {
            "circle-radius": 14,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#fff",
          },
        });
      } else {
        (map.getSource(TEAMS_SOURCE_ID) as mapboxgl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features,
        });
      }
    };

    if (map.isStyleLoaded()) {
      applyData();
    } else {
      map.once("load", applyData);
    }
  }, [teams]);

  const hasValidPositions = teams.some((t) => t.lat !== 0 || t.lng !== 0);

  if (!accessToken) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground">
        Lisa NEXT_PUBLIC_MAPBOX_TOKEN, et kaart kuvada.
      </div>
    );
  }

  function formatRemaining(endsAt: string): string {
    const end = new Date(endsAt).getTime();
    const secs = Math.max(0, Math.floor((end - now.getTime()) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const teamsWithPenalty = teams.filter(
    (t) => t.activePenalty != null || (t.queuedPenalties?.length ?? 0) > 0
  );

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-white/5 bg-muted/30 backdrop-blur-sm dark:border-white/10">
      <div ref={mapRef} className="h-[400px] w-full" />
      {!hasValidPositions && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <p className="text-muted-foreground">Ootame meeskondade asukohte…</p>
        </div>
      )}
      {teamsWithPenalty.length > 0 && (
        <div className="absolute left-2 right-2 top-2 flex flex-col gap-2">
          {teamsWithPenalty.map((t) => (
            <div
              key={t.teamId}
              className="flex flex-col gap-0.5 rounded bg-background/90 px-2 py-1.5 text-xs font-medium backdrop-blur"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base" aria-hidden>❄️</span>
                <span className="truncate">{t.name}:</span>
                {t.activePenalty ? (
                  <span className="text-primary">
                    {t.activePenalty.title}
                    {t.activePenalty.endsAt ? (
                      <> ({formatRemaining(t.activePenalty.endsAt)})</>
                    ) : (
                      " (aktiivne)"
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              {(t.queuedPenalties?.length ?? 0) > 0 && (
                <div className="ml-5 flex flex-wrap gap-x-2 gap-y-0.5 text-muted-foreground">
                  {t.queuedPenalties!.map((q, i) => (
                    <span key={i} className="text-[11px]">
                      Järgmine: {q.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="absolute bottom-2 left-2 right-2 rounded bg-background/80 px-2 py-1 text-center text-xs text-muted-foreground backdrop-blur">
        Täpid: viimane teadaolev asukoht (või stardipunkt Pariis/Tallinn, kui asukohta veel jagatud pole).
        {teamsWithPenalty.length > 0 && " Sinine täpp = karistus aktiivne."}
      </p>
    </div>
  );
}
