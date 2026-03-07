"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TeamLocation } from "@/types";
import { haversineDistanceKm } from "@/lib/utils";

const MAP_CENTER: [number, number] = [15.5, 52]; // fallback Europe
const MAP_ZOOM = 4;
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const FIT_PADDING = 100; // px around team positions so other countries stay visible
const FIT_MAX_ZOOM = 6;  // don't zoom in past this (higher = more zoom)
const SINGLE_POINT_ZOOM = 5; // zoom when only one team has location
const TEAMS_SOURCE_ID = "teams-points";
const TEAMS_LAYER_ID = "teams-circles";
const TEAMS_ICONS_LAYER_ID = "teams-icons";
const TEAM_ICON_SIZE = 0.08; // scale so profile image is a small marker (~30–40px), not full-screen
const TRAILS_SOURCE_ID = "teams-trails";
const TRAILS_LAYER_ID = "teams-trails-line";
const COUNTRIES_SOURCE_ID = "country-unlocks";
const COUNTRIES_LAYER_ID = "country-unlocks-fill";
const COUNTRIES_GEOJSON_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const COUNTRY_FILL_OPACITY = 0.35;

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
  imageUrl: string | null;
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
    imageUrl?: string | null;
    lastLat: number | null;
    lastLng: number | null;
    lastUpdatedAt: Date | null;
    activePenalty?: ActivePenalty | null;
    queuedPenalties?: QueuedPenalty[];
  }[];
  channelName?: string;
  accessToken: string;
  /** When true, map fills available height (for full-viewport layout). */
  fullHeight?: boolean;
};

const FROZEN_COLOR = "#93c5fd"; // ice blue for active penalty

/** Fallback image paths when DB has no imageUrl (e.g. before migration). */
function getDefaultTeamImageUrl(teamId: number): string | null {
  if (teamId === 1) return "/team1.png";
  if (teamId === 2) return "/team2.png";
  return null;
}

export function RaceMap({
  teams: initialTeams,
  channelName = "race",
  accessToken,
  fullHeight,
}: RaceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const hasFittedBounds = useRef(false);

  const [teams, setTeams] = useState<TeamState[]>(
    initialTeams.map((t) => {
      const defaultPos = DEFAULT_POSITIONS[t.id];
      const hasBroadcast = t.lastLat != null && t.lastLng != null;
      return {
        teamId: t.id,
        name: t.name,
        color: t.color,
        imageUrl: t.imageUrl ?? getDefaultTeamImageUrl(t.id),
        lat: hasBroadcast ? t.lastLat! : (defaultPos?.[0] ?? 0),
        lng: hasBroadcast ? t.lastLng! : (defaultPos?.[1] ?? 0),
        lastUpdatedAt: t.lastUpdatedAt,
        activePenalty: t.activePenalty ?? null,
        queuedPenalties: t.queuedPenalties ?? [],
      };
    })
  );
  const [now, setNow] = useState(() => new Date());
  const [trails, setTrails] = useState<Record<number, { color: string; coordinates: [number, number][] }>>({});
  const [countryUnlocks, setCountryUnlocks] = useState<Record<string, number>>({});
  const [countriesGeoJson, setCountriesGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);

  const fetchTrails = useCallback(async () => {
    try {
      const res = await fetch("/api/teams/trails");
      if (!res.ok) return;
      const data = await res.json();
      setTrails(data);
    } catch (_) {}
  }, []);

  const fetchCountryUnlocks = useCallback(async () => {
    try {
      const res = await fetch("/api/countries/unlocked");
      if (!res.ok) return;
      const data = await res.json();
      setCountryUnlocks(data);
    } catch (_) {}
  }, []);

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

  const fetchTeams = useCallback(async () => {
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
            imageUrl: fromApi.imageUrl ?? getDefaultTeamImageUrl(t.teamId) ?? t.imageUrl,
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
  }, []);

  // Subscribe to realtime location + penalty updates (Pusher) when configured
  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    let cleanup: (() => void) | undefined;
    import("pusher-js").then(({ default: Pusher }) => {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      });
      const channel = pusher.subscribe(channelName);
      channel.bind("location-update", (data: TeamLocation) => {
        fetchCountryUnlocks();
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
        fetchTrails();
      });
      channel.bind("penalty-update", () => {
        fetchTeams();
        fetchCountryUnlocks();
      });
      channel.bind("country-unlock", () => fetchCountryUnlocks());
      cleanup = () => {
      channel.unbind("location-update");
      channel.unbind("penalty-update");
      channel.unbind("country-unlock");
      pusher.unsubscribe(channelName);
      };
    });
    return () => cleanup?.();
  }, [channelName, fetchTeams, fetchTrails, fetchCountryUnlocks]);

  // Load countries GeoJSON once (for country fill layer)
  useEffect(() => {
    let cancelled = false;
    fetch(COUNTRIES_GEOJSON_URL)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCountriesGeoJson(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Poll: soon, then every 30s.
  useEffect(() => {
    const doFetch = () => {
      fetchTeams();
      fetchTrails();
      fetchCountryUnlocks();
    };
    const t0 = setTimeout(doFetch, 500);
    const interval = setInterval(doFetch, 30000);
    return () => {
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [fetchTeams, fetchTrails, fetchCountryUnlocks]);

  // When buyer completes checkout (popup), refetch so map updates even if Pusher is slow
  useEffect(() => {
    const onCheckout = () => fetchTeams();
    window.addEventListener("checkout-success", onCheckout);
    return () => window.removeEventListener("checkout-success", onCheckout);
  }, [fetchTeams]);

  // Countdown ticker for penalty timers
  useEffect(() => {
    const hasActive = teams.some((t) => t.activePenalty != null);
    if (!hasActive) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [teams]);

  // Draw team trails (lines behind the dots)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const trailFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = Object.entries(
      trails
    ).map(([teamId, { color, coordinates }]) => ({
      type: "Feature" as const,
      properties: { teamId: Number(teamId), color },
      geometry: { type: "LineString" as const, coordinates },
    }));

    const trailsData = {
      type: "FeatureCollection" as const,
      features: trailFeatures,
    };

    const applyTrails = () => {
      if (!map.getSource(TRAILS_SOURCE_ID)) {
        map.addSource(TRAILS_SOURCE_ID, {
          type: "geojson",
          data: trailsData,
        });
        const beforeId = map.getLayer(TEAMS_LAYER_ID) ? TEAMS_LAYER_ID : undefined;
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
        (map.getSource(TRAILS_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          trailsData
        );
      }
    };

    if (map.isStyleLoaded()) {
      applyTrails();
    } else {
      map.once("load", applyTrails);
    }
  }, [trails]);

  // Country unlocks: fill unlocked countries with the team color that reached them first
  const countryColors = useMemo(() => {
    const out: Record<string, string> = {};
    Object.entries(countryUnlocks).forEach(([code, teamId]) => {
      const team = teams.find((t) => t.teamId === teamId);
      if (team?.color) out[code] = team.color;
    });
    return out;
  }, [countryUnlocks, teams]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !countriesGeoJson) return;

    const applyCountriesLayer = () => {
      if (!map.getSource(COUNTRIES_SOURCE_ID)) {
        map.addSource(COUNTRIES_SOURCE_ID, {
          type: "geojson",
          data: countriesGeoJson,
        });
      } else {
        (map.getSource(COUNTRIES_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          countriesGeoJson
        );
      }

      // Support both iso_a2 and ISO_A2 (Natural Earth 50m uses ISO_A2)
      const matchExpr: unknown[] = [
        "match",
        ["upcase", ["coalesce", ["get", "iso_a2"], ["get", "ISO_A2"]]],
      ];
      Object.entries(countryColors).forEach(([code, color]) => {
        matchExpr.push(code, color);
      });
      matchExpr.push("rgba(0,0,0,0)");

      const hasUnlocks = Object.keys(countryColors).length > 0;
      if (map.getLayer(COUNTRIES_LAYER_ID)) {
        map.setPaintProperty(
          COUNTRIES_LAYER_ID,
          "fill-color",
          matchExpr as mapboxgl.Expression
        );
        map.setPaintProperty(
          COUNTRIES_LAYER_ID,
          "fill-opacity",
          hasUnlocks ? COUNTRY_FILL_OPACITY : 0
        );
        map.setPaintProperty(
          COUNTRIES_LAYER_ID,
          "fill-outline-color",
          matchExpr as mapboxgl.Expression
        );
      } else {
        const beforeId = map.getLayer(TRAILS_LAYER_ID)
          ? TRAILS_LAYER_ID
          : map.getLayer(TEAMS_LAYER_ID)
            ? TEAMS_LAYER_ID
            : undefined;
        map.addLayer(
          {
            id: COUNTRIES_LAYER_ID,
            type: "fill",
            source: COUNTRIES_SOURCE_ID,
            paint: {
              "fill-color": matchExpr as mapboxgl.Expression,
              "fill-opacity": hasUnlocks ? COUNTRY_FILL_OPACITY : 0,
              "fill-outline-color": matchExpr as mapboxgl.Expression,
            },
          },
          beforeId
        );
      }
    };

    if (map.isStyleLoaded()) {
      applyCountriesLayer();
    } else {
      map.once("load", applyCountriesLayer);
    }
  }, [countriesGeoJson, countryColors]);

  // Fit map to team positions once (so view is centered on live locations, zoomed in enough to see them)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || hasFittedBounds.current) return;

    const valid = teams.filter(
      (t) =>
        typeof t.lat === "number" &&
        typeof t.lng === "number" &&
        t.lat >= -90 &&
        t.lat <= 90 &&
        t.lng >= -180 &&
        t.lng <= 180 &&
        !(t.lat === 0 && t.lng === 0)
    );
    if (valid.length === 0) return;

    const doFit = () => {
      if (valid.length === 1) {
        map.setCenter([valid[0].lng, valid[0].lat]);
        map.setZoom(SINGLE_POINT_ZOOM);
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        valid.forEach((t) => bounds.extend([t.lng, t.lat]));
        map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, duration: 0 });
      }
      hasFittedBounds.current = true;
    };

    if (map.isStyleLoaded()) doFit();
    else map.once("load", doFit);
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
          ...(t.imageUrl ? { icon: `team-${t.teamId}` } : {}),
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    });

    const withImages = teams.filter((t) => (t.imageUrl ?? "").trim());
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const loadTeamImagesAndAddSymbolLayer = () => {
      if (withImages.length === 0) return;
      let pending = withImages.length;
      withImages.forEach((t) => {
        const raw = (t.imageUrl ?? "").trim();
        const url = raw.startsWith("http") ? raw : `${origin}${raw.startsWith("/") ? "" : "/"}${raw}`;
        map.loadImage(url, (err, img) => {
          if (!err && img && !map.hasImage(`team-${t.teamId}`)) {
            map.addImage(`team-${t.teamId}`, img);
          }
          pending -= 1;
          if (pending === 0) {
            if (!map.getLayer(TEAMS_ICONS_LAYER_ID)) {
              map.addLayer({
                id: TEAMS_ICONS_LAYER_ID,
                type: "symbol",
                source: TEAMS_SOURCE_ID,
                filter: ["has", "icon"],
                layout: {
                  "icon-image": ["get", "icon"],
                  "icon-size": TEAM_ICON_SIZE,
                  "icon-allow-overlap": true,
                },
              });
            }
          }
        });
      });
    };

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
          filter: ["!", ["has", "icon"]], // only draw circle for teams without profile image
          paint: {
            "circle-radius": 14,
            "circle-color": ["get", "color"],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#fff",
          },
        });
        loadTeamImagesAndAddSymbolLayer();
      } else {
        (map.getSource(TEAMS_SOURCE_ID) as mapboxgl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features,
        });
        loadTeamImagesAndAddSymbolLayer();
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
      <div className={`flex items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground ${fullHeight ? "min-h-0 flex-1" : "h-[400px]"}`}>
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

  // Only show teams with active pause timer – no "next/queued" on map
  const teamsWithPenalty = teams.filter((t) => t.activePenalty != null);

  // Distance between the two teams (when both have valid positions)
  const team1 = teams[0];
  const team2 = teams[1];
  const valid1 = team1 && typeof team1.lat === "number" && typeof team1.lng === "number" && !(team1.lat === 0 && team1.lng === 0);
  const valid2 = team2 && typeof team2.lat === "number" && typeof team2.lng === "number" && !(team2.lat === 0 && team2.lng === 0);
  const distanceKm = valid1 && valid2 ? haversineDistanceKm(team1.lat, team1.lng, team2.lat, team2.lng) : null;
  const distanceText = distanceKm != null
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} m`
      : `${distanceKm.toFixed(1)} km`
    : null;

  return (
    <div className={`relative w-full overflow-hidden rounded-lg border border-white/5 bg-muted/30 backdrop-blur-sm dark:border-white/10 ${fullHeight ? "flex min-h-0 flex-1 flex-col" : ""}`}>
      <div ref={mapRef} className={`w-full ${fullHeight ? "min-h-0 flex-1" : "h-[400px]"}`} />
      {!hasValidPositions && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <p className="text-muted-foreground">Ootame meeskondade asukohte…</p>
        </div>
      )}
      <div className="absolute left-2 top-2 flex w-fit max-w-[85%] flex-col gap-2">
        {distanceText != null && (
          <div className="rounded bg-background/90 px-2 py-1.5 text-xs font-medium backdrop-blur">
            <span className="text-muted-foreground">Tiimide vahe: </span>
            <span className="text-primary font-semibold">{distanceText}</span>
          </div>
        )}
        {teamsWithPenalty.length > 0 && teamsWithPenalty.map((t) => (
          <div
            key={t.teamId}
            className="flex items-center gap-1.5 rounded bg-background/90 px-2 py-1.5 text-xs font-medium backdrop-blur"
          >
            <span className="text-base" aria-hidden>❄️</span>
            <span className="truncate">{t.name}:</span>
            <span className="text-primary">
              {t.activePenalty!.title}
              {t.activePenalty!.endsAt ? (
                <> ({formatRemaining(t.activePenalty!.endsAt)})</>
              ) : (
                " (aktiivne)"
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="absolute bottom-2 left-2 right-2 rounded bg-background/80 px-2 py-1 text-center text-xs text-muted-foreground backdrop-blur">
        Täpid: viimane asukoht. Jooned: tee, kust meeskonnad on läbi käinud.
        {teamsWithPenalty.length > 0 && " Sinine täpp = karistus aktiivne."}
      </p>
    </div>
  );
}
