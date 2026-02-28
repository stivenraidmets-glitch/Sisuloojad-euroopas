"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const SOURCE_ID = "team-point";
const LAYER_ID = "team-circle";
const TRAILS_SOURCE_ID = "team-trail";
const TRAILS_LAYER_ID = "team-trail-line";
const FROZEN_COLOR = "#93c5fd"; // ice blue for active penalty

type ActivePenalty = {
  title: string;
  type: string;
  endsAt: string | null;
  durationMinutes: number;
};

type TeamPageMapProps = {
  teamId: number;
  name: string;
  color: string;
  lastLat: number | null;
  lastLng: number | null;
  /** Current active TIMEOUT penalty for this team (from server) */
  initialActivePenalty?: ActivePenalty | null;
  /** Trail line for this team (from server) – live updates via Pusher + poll */
  initialTrail?: { color: string; coordinates: [number, number][] } | null;
  accessToken: string;
};

export function TeamPageMap({
  teamId,
  name,
  color,
  lastLat: initialLat,
  lastLng: initialLng,
  initialActivePenalty = null,
  initialTrail = null,
  accessToken,
}: TeamPageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [activePenalty, setActivePenalty] = useState<ActivePenalty | null>(initialActivePenalty ?? null);
  const [trail, setTrail] = useState<{ color: string; coordinates: [number, number][] } | null>(initialTrail);
  const [now, setNow] = useState(() => new Date());

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) return;
      const data = await res.json();
      const t = data.find((d: { id: number }) => d.id === teamId);
      if (!t) return;
      if (t.lastLat != null && t.lastLng != null) {
        setLat(t.lastLat);
        setLng(t.lastLng);
      }
      setActivePenalty(t.activePenalty ?? null);
    } catch (_) {}
  }, [teamId]);

  const fetchTrails = useCallback(async () => {
    try {
      const res = await fetch("/api/teams/trails");
      if (!res.ok) return;
      const data = await res.json();
      const tTrail = data[teamId];
      if (tTrail && Array.isArray(tTrail.coordinates) && tTrail.coordinates.length >= 2) {
        setTrail({ color: tTrail.color, coordinates: tTrail.coordinates });
      } else {
        setTrail(null);
      }
    } catch (_) {}
  }, [teamId]);

  const initMap = useCallback(() => {
    if (!mapRef.current || !accessToken) return;
    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: MAP_STYLE,
      center: initialLat != null && initialLng != null ? [initialLng, initialLat] : [15.5, 52],
      zoom: initialLat != null && initialLng != null ? 8 : 4,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapInstance.current = map;
  }, [accessToken, initialLat, initialLng]);

  useEffect(() => {
    initMap();
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [initMap]);

  // Sync server initial data when props change (e.g. navigation)
  useEffect(() => {
    setActivePenalty(initialActivePenalty ?? null);
    setTrail(initialTrail);
  }, [initialActivePenalty, initialTrail]);

  // Fetch + Pusher live updates
  useEffect(() => {
    const doFetch = () => {
      fetchTeam();
      fetchTrails();
    };
    const t0 = setTimeout(doFetch, 500);
    const interval = setInterval(doFetch, 15000);
    return () => {
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [fetchTeam, fetchTrails]);

  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    let cleanup: (() => void) | undefined;
    import("pusher-js").then(({ default: Pusher }) => {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      });
      const channel = pusher.subscribe("race");
      channel.bind("location-update", (data: { teamId: number; lat: number; lng: number }) => {
        if (data.teamId === teamId) {
          setLat(data.lat);
          setLng(data.lng);
          fetchTrails();
        }
      });
      channel.bind("penalty-update", fetchTeam);
      cleanup = () => {
        channel.unbind("location-update");
        channel.unbind("penalty-update");
        pusher.unsubscribe("race");
      };
    });
    return () => cleanup?.();
  }, [teamId, fetchTeam, fetchTrails]);

  // Timer tick when penalty active
  useEffect(() => {
    if (!activePenalty) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [activePenalty]);

  // Draw trail line (below circle)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !trail) return;

    const trailData = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { color: trail.color },
          geometry: { type: "LineString" as const, coordinates: trail.coordinates },
        },
      ],
    };

    const applyTrails = () => {
      if (!map.getSource(TRAILS_SOURCE_ID)) {
        map.addSource(TRAILS_SOURCE_ID, { type: "geojson", data: trailData });
        const beforeId = map.getLayer(LAYER_ID) ? LAYER_ID : undefined;
        map.addLayer(
          {
            id: TRAILS_LAYER_ID,
            type: "line",
            source: TRAILS_SOURCE_ID,
            paint: {
              "line-color": ["get", "color"],
              "line-width": 3,
              "line-opacity": 0.7,
            },
          },
          beforeId
        );
      } else {
        (map.getSource(TRAILS_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(trailData);
      }
    };

    if (map.isStyleLoaded()) {
      applyTrails();
    } else {
      map.once("load", applyTrails);
    }
  }, [trail]);

  // Remove trail layer when no trail data
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || trail) return;
    try {
      if (map.getLayer(TRAILS_LAYER_ID)) map.removeLayer(TRAILS_LAYER_ID);
      if (map.getSource(TRAILS_SOURCE_ID)) map.removeSource(TRAILS_SOURCE_ID);
    } catch (_) {}
  }, [trail]);

  // Draw team position (circle – frozen when penalty active)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || lat == null || lng == null) return;

    const isFrozen = activePenalty != null;
    const circleColor = isFrozen ? FROZEN_COLOR : color;
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [
      {
        type: "Feature",
        properties: { color: circleColor },
        geometry: { type: "Point", coordinates: [lng, lat] },
      },
    ];

    const applyData = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });
        map.addLayer({
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": 16,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#fff",
          },
        });
      } else {
        (map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features,
        });
      }
      map.flyTo({ center: [lng, lat], zoom: 8, duration: 500 });
    };

    if (map.isStyleLoaded()) {
      applyData();
    } else {
      map.once("load", applyData);
    }
  }, [lat, lng, color, activePenalty]);

  function formatRemaining(endsAt: string): string {
    const end = new Date(endsAt).getTime();
    const secs = Math.max(0, Math.floor((end - now.getTime()) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!accessToken) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Kaarti ei saa kuvada (puudub kaardi võti).
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border bg-muted/30">
      <div ref={mapRef} className="h-[280px] w-full" />
      {activePenalty && (
        <div className="absolute left-2 top-2 flex w-fit max-w-[85%] flex-col gap-1 rounded bg-background/90 px-2 py-1.5 text-xs font-medium backdrop-blur">
          <div className="flex items-center gap-1.5">
            <span className="text-base" aria-hidden>❄️</span>
            <span className="truncate">{name}:</span>
            <span className="text-primary">
              {activePenalty.title}
              {activePenalty.endsAt ? (
                <> ({formatRemaining(activePenalty.endsAt)})</>
              ) : (
                " (aktiivne)"
              )}
            </span>
          </div>
        </div>
      )}
      <p className="absolute bottom-2 left-2 right-2 rounded bg-background/80 px-2 py-1 text-center text-xs text-muted-foreground backdrop-blur">
        Sinine täpp = karistus aktiivne. Joon = tee, kust meeskond on läbi käinud.
      </p>
    </div>
  );
}
