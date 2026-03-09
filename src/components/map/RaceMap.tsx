"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSession } from "next-auth/react";
import type { TeamLocation } from "@/types";
import { haversineDistanceKm } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { TeamMarkerPopup } from "./TeamMarkerPopup";
import { EventTimer } from "@/components/event/EventTimer";

const MAP_CENTER: [number, number] = [15.5, 52]; // fallback Europe
const MAP_ZOOM = 4; // default zoom (Europe regional); map starts at this height
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const TEAMS_SOURCE_ID = "teams-points";
const TEAMS_LAYER_ID = "teams-circles";
const TEAM_MARKER_SIZE_PX = 40; // size of profile image markers (HTML markers for correct PNG transparency)

function formatRemainingStatic(endsAt: string): string {
  const end = new Date(endsAt).getTime();
  const secs = Math.max(0, Math.floor((end - Date.now()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isPenaltyStillActive(activePenalty: ActivePenalty | null): boolean {
  if (!activePenalty) return false;
  if (!activePenalty.endsAt) return true;
  return new Date(activePenalty.endsAt).getTime() > Date.now();
}
const TRAILS_SOURCE_ID = "teams-trails";
const TRAILS_LAYER_ID = "teams-trails-line";
const COUNTRIES_SOURCE_ID = "country-unlocks";
const COUNTRIES_LAYER_ID = "country-unlocks-fill";
const SPAIN_CODE = "ES"; // start of race; static 3 equal stripes (team 1, 2, 3)
const SPAIN_PATTERN_ID = "spain-start-pattern";
const SPAIN_LAYER_ID = "spain-start-fill";
// Static colors for Spain: Team 1 blue, Team 2 red, Team 3 green (equal-width stripes)
const SPAIN_STRIPE_COLORS = ["#3B82F6", "#EF4444", "#22C55E"] as const;
const ESTONIA_CODE = "EE"; // grand finish – gold glow
const ESTONIA_FILL_LAYER_ID = "estonia-finish-fill";
const ESTONIA_GLOW_LAYER_ID = "estonia-finish-glow";
const ESTONIA_GOLD = "#eab308";
const ESTONIA_GLOW_COLOR = "#fde047";
const COUNTRIES_GEOJSON_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const COUNTRY_FILL_OPACITY = 0.35;
export const OPEN_PANEL_TAB = "open-panel-tab" as const;

// Default positions when no location has been broadcast yet.
const DEFAULT_POSITIONS: Record<number, [number, number]> = {
  1: [40.4168, -3.7038], // Madrid
  2: [41.6488, -0.8891], // Zaragoza
  3: [39.4699, -0.3763], // Valencia
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
  totalDistanceKm: number;
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
    totalDistanceKm?: number;
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
  const teamMarkersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const teamPopupRef = useRef<mapboxgl.Popup | null>(null);
  const teamPopupRootRef = useRef<Root | null>(null);
  const teamsRef = useRef<TeamState[]>([]);
  const timerElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const voteHandlerRef = useRef<((teamId: number) => Promise<void>) | null>(null);
  const { status } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    voteHandlerRef.current = async (teamId: number) => {
      if (status !== "authenticated") {
        toast({ title: "Palun logi sisse, et hääletada", variant: "destructive" });
        return;
      }
      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to vote");
        toast({ title: "Hääl salvestatud!" });
      } catch (e) {
        toast({
          title: e instanceof Error ? e.message : "Hääletamine ebaõnnestus",
          variant: "destructive",
        });
      }
    };
    return () => {
      voteHandlerRef.current = null;
    };
  }, [status, toast]);

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
        totalDistanceKm: t.totalDistanceKm ?? 0,
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
          const apiImage = fromApi.imageUrl != null ? String(fromApi.imageUrl).trim() : "";
          const next = {
            ...t,
            imageUrl: apiImage || getDefaultTeamImageUrl(t.teamId) || t.imageUrl || null,
            totalDistanceKm: typeof fromApi.totalDistanceKm === "number" ? fromApi.totalDistanceKm : t.totalDistanceKm,
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

  // Poll: soon, then every 5s (so new punishments and timer end show without refresh).
  useEffect(() => {
    const doFetch = () => {
      fetchTeams();
      fetchTrails();
      fetchCountryUnlocks();
    };
    const t0 = setTimeout(doFetch, 500);
    const interval = setInterval(doFetch, 5000);
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

  // Countdown ticker for penalty timers: update timer DOM; when 0, remove timer and refetch
  useEffect(() => {
    const hasActive = teams.some((t) => isPenaltyStillActive(t.activePenalty));
    if (!hasActive) return;
    const interval = setInterval(() => {
      setNow((n) => new Date());
      const currentTeams = teamsRef.current ?? [];
      const toRemove: number[] = [];
      timerElementsRef.current.forEach((el, teamId) => {
        const team = currentTeams.find((x) => x.teamId === teamId);
        if (!team?.activePenalty) {
          toRemove.push(teamId);
          return;
        }
        if (!isPenaltyStillActive(team.activePenalty)) {
          toRemove.push(teamId);
          return;
        }
        const text = team.activePenalty.endsAt
          ? `❄️ ${team.name}: ${team.activePenalty.title} (${formatRemainingStatic(team.activePenalty.endsAt)})`
          : `❄️ ${team.name}: ${team.activePenalty.title} (aktiivne)`;
        el.textContent = text;
      });
      toRemove.forEach((teamId) => {
        const el = timerElementsRef.current.get(teamId);
        if (el?.parentNode) {
          el.parentNode.removeChild(el);
        }
        timerElementsRef.current.delete(teamId);
      });
      if (toRemove.length > 0) fetchTeams();
    }, 1000);
    return () => clearInterval(interval);
  }, [teams, fetchTeams]);

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

      // Prefer ISO_A2_EH (correct codes for -99 countries e.g. France), then iso_a2, then ISO_A2
      const codeGetter: mapboxgl.Expression = [
        "upcase",
        ["coalesce", ["get", "ISO_A2_EH"], ["get", "iso_a2"], ["get", "ISO_A2"]],
      ];
      const matchExpr: unknown[] = ["match", codeGetter];
      Object.entries(countryColors).forEach(([code, color]) => {
        if (code === SPAIN_CODE) return; // Spain drawn separately as static 3-team stripes (start)
        if (code === ESTONIA_CODE) return; // Estonia drawn separately as gold finish
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

      // Spain = start; static 3 equal vertical stripes (team 1, 2, 3 colors)
      const size = 33; // divisible by 3 for equal stripes
      const stripeCount = SPAIN_STRIPE_COLORS.length;
      const stripeWidth = size / stripeCount;
      const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
      if (canvas) {
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          SPAIN_STRIPE_COLORS.forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.fillRect(index * stripeWidth, 0, stripeWidth, size);
          });
          const imageData = ctx.getImageData(0, 0, size, size);
          if (map.hasImage(SPAIN_PATTERN_ID)) map.removeImage(SPAIN_PATTERN_ID);
          map.addImage(SPAIN_PATTERN_ID, imageData, { width: size, height: size });
        }
      }
      const spainFilter: mapboxgl.Expression = [
        "==",
        ["upcase", ["coalesce", ["get", "ISO_A2_EH"], ["get", "iso_a2"], ["get", "ISO_A2"]]],
        SPAIN_CODE,
      ];
      if (map.getLayer(SPAIN_LAYER_ID)) {
        map.setPaintProperty(SPAIN_LAYER_ID, "fill-opacity", COUNTRY_FILL_OPACITY);
      } else {
        map.addLayer(
          {
            id: SPAIN_LAYER_ID,
            type: "fill",
            source: COUNTRIES_SOURCE_ID,
            filter: spainFilter,
            paint: {
              "fill-pattern": SPAIN_PATTERN_ID,
              "fill-opacity": COUNTRY_FILL_OPACITY,
            },
          },
          COUNTRIES_LAYER_ID
        );
      }

      // Estonia = grand finish – gold fill + glowing overlay
      const estoniaFilter: mapboxgl.Expression = [
        "==",
        ["upcase", ["coalesce", ["get", "ISO_A2_EH"], ["get", "iso_a2"], ["get", "ISO_A2"]]],
        ESTONIA_CODE,
      ];
      if (!map.getLayer(ESTONIA_FILL_LAYER_ID)) {
        map.addLayer(
          {
            id: ESTONIA_FILL_LAYER_ID,
            type: "fill",
            source: COUNTRIES_SOURCE_ID,
            filter: estoniaFilter,
            paint: {
              "fill-color": ESTONIA_GOLD,
              "fill-opacity": 0.75,
              "fill-outline-color": "#fde047",
            },
          },
          SPAIN_LAYER_ID
        );
      }
      if (!map.getLayer(ESTONIA_GLOW_LAYER_ID)) {
        map.addLayer(
          {
            id: ESTONIA_GLOW_LAYER_ID,
            type: "fill",
            source: COUNTRIES_SOURCE_ID,
            filter: estoniaFilter,
            paint: {
              "fill-color": ESTONIA_GLOW_COLOR,
              "fill-opacity": 0.35,
            },
          },
          ESTONIA_FILL_LAYER_ID
        );
      }
    };

    if (map.isStyleLoaded()) {
      applyCountriesLayer();
    } else {
      map.once("load", applyCountriesLayer);
    }
  }, [countriesGeoJson, countryColors, teams]);

  // Animate Estonia glow (grand finish)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    let rafId: number;
    const start = Date.now();
    const periodMs = 2200;
    const minOpacity = 0.2;
    const maxOpacity = 0.65;

    const tick = () => {
      const layer = map.getLayer(ESTONIA_GLOW_LAYER_ID);
      if (layer) {
        const t = (Date.now() - start) / periodMs;
        const opacity = minOpacity + (maxOpacity - minOpacity) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
        map.setPaintProperty(ESTONIA_GLOW_LAYER_ID, "fill-opacity", opacity);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Start at default Europe zoom; no auto-fit to teams so the map always opens at this height
  // (Users can pan/zoom to teams; initial view stays consistent.)

  // Draw team positions as map layers – frozen teams get ice-blue circle
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    teamsRef.current = teams;

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
      const isFrozen = isPenaltyStillActive(t.activePenalty);
      const hasImage = !!(t.imageUrl ?? "").trim();
      features.push({
        type: "Feature",
        properties: {
          teamId: t.teamId,
          color: isFrozen ? FROZEN_COLOR : t.color,
          hasImage: hasImage ? 1 : 0,
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    });

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const updateImageMarkers = () => {
      const toShow = new Set<number>();
      teams.forEach((t) => {
        const raw = (t.imageUrl ?? getDefaultTeamImageUrl(t.teamId) ?? "").trim();
        if (!raw) return;
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
        toShow.add(t.teamId);
        const url = raw.startsWith("http") ? raw : `${origin}${raw.startsWith("/") ? "" : "/"}${raw}`;
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.alignItems = "center";
        wrapper.style.cursor = "pointer";
        if (!isPenaltyStillActive(t.activePenalty)) {
          timerElementsRef.current.delete(t.teamId);
        }
        if (isPenaltyStillActive(t.activePenalty) && t.activePenalty) {
          const timerText = t.activePenalty.endsAt
            ? `❄️ ${t.name}: ${t.activePenalty.title} (${formatRemainingStatic(t.activePenalty.endsAt)})`
            : `❄️ ${t.name}: ${t.activePenalty.title} (aktiivne)`;
          const timerEl = document.createElement("div");
          timerEl.textContent = timerText;
          timerEl.style.whiteSpace = "nowrap";
          timerEl.style.fontSize = "10px";
          timerEl.style.background = "rgba(0,0,0,0.85)";
          timerEl.style.color = "#fff";
          timerEl.style.padding = "2px 6px";
          timerEl.style.borderRadius = "4px";
          timerEl.style.marginBottom = "2px";
          wrapper.appendChild(timerEl);
          timerElementsRef.current.set(t.teamId, timerEl);
        }
        const el = document.createElement("div");
        el.style.width = `${TEAM_MARKER_SIZE_PX}px`;
        el.style.height = `${TEAM_MARKER_SIZE_PX}px`;
        el.style.borderRadius = "50%";
        el.style.overflow = "hidden";
        el.style.background = "transparent";
        el.style.border = "2px solid #fff";
        el.style.boxSizing = "border-box";
        const img = document.createElement("img");
        img.src = url;
        img.alt = t.name;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.display = "block";
        el.appendChild(img);
        wrapper.appendChild(el);
        const teamId = t.teamId;
        const existing = teamMarkersRef.current.get(t.teamId);
        if (existing) {
          existing.remove();
          teamMarkersRef.current.delete(t.teamId);
        }
        wrapper.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const team = teamsRef.current.find((x) => x.teamId === teamId);
          if (!team) return;
          if (teamPopupRef.current) {
            teamPopupRef.current.remove();
            teamPopupRef.current = null;
          }
          if (teamPopupRootRef.current) {
            teamPopupRootRef.current.unmount();
            teamPopupRootRef.current = null;
          }
          const container = document.createElement("div");
          const root = createRoot(container);
          teamPopupRootRef.current = root;
          const formatRemainingFn = (endsAt: string) => {
            const end = new Date(endsAt).getTime();
            const secs = Math.max(0, Math.floor((end - Date.now()) / 1000));
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return `${m}:${s.toString().padStart(2, "0")}`;
          };
          root.render(
            <TeamMarkerPopup
              teamName={team.name}
              totalDistanceKm={team.totalDistanceKm}
              activePenalty={team.activePenalty}
              formatRemaining={formatRemainingFn}
              onVote={async () => voteHandlerRef.current?.(teamId)}
              onBuyPunishment={() => {
                window.dispatchEvent(
                  new CustomEvent(OPEN_PANEL_TAB, { detail: { tab: "punishments" as const } })
                );
                teamPopupRef.current?.remove();
                teamPopupRef.current = null;
              }}
            />
          );
          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: "team-marker-popup",
          })
            .setLngLat([lng, lat])
            .setDOMContent(container)
            .addTo(map);
          teamPopupRef.current = popup;
          popup.on("close", () => {
            root.unmount();
            teamPopupRootRef.current = null;
            teamPopupRef.current = null;
          });
        });
        const marker = new mapboxgl.Marker({ element: wrapper })
          .setLngLat([lng, lat])
          .addTo(map);
        teamMarkersRef.current.set(t.teamId, marker);
      });
      teamMarkersRef.current.forEach((marker, teamId) => {
        if (!toShow.has(teamId)) {
          marker.remove();
          teamMarkersRef.current.delete(teamId);
          timerElementsRef.current.delete(teamId);
        }
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
          filter: ["==", ["get", "hasImage"], 0],
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
      updateImageMarkers();
    };

    if (map.isStyleLoaded()) {
      applyData();
    } else {
      map.once("load", applyData);
    }
  }, [teams]);

  // Clean up markers, timer refs, and popup only on unmount
  useEffect(() => {
    return () => {
      teamMarkersRef.current.forEach((m) => m.remove());
      teamMarkersRef.current.clear();
      timerElementsRef.current.clear();
      teamPopupRef.current?.remove();
      teamPopupRef.current = null;
      teamPopupRootRef.current?.unmount();
      teamPopupRootRef.current = null;
    };
  }, []);

  const hasValidPositions = teams.some((t) => t.lat !== 0 || t.lng !== 0);

  if (!accessToken) {
    return (
      <div className={`flex items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground ${fullHeight ? "min-h-0 flex-1" : "h-[400px]"}`}>
        Lisa NEXT_PUBLIC_MAPBOX_TOKEN, et kaart kuvada.
      </div>
    );
  }

  const teamsWithPenalty = teams.filter((t) => isPenaltyStillActive(t.activePenalty));

  // Distance summary: for 2 teams show gap, for 3+ teams show largest gap
  const validDistanceTeams = teams.filter(
    (team) =>
      typeof team.lat === "number" &&
      typeof team.lng === "number" &&
      !(team.lat === 0 && team.lng === 0)
  );
  let distanceKm: number | null = null;
  for (let i = 0; i < validDistanceTeams.length; i += 1) {
    for (let j = i + 1; j < validDistanceTeams.length; j += 1) {
      const d = haversineDistanceKm(
        validDistanceTeams[i].lat,
        validDistanceTeams[i].lng,
        validDistanceTeams[j].lat,
        validDistanceTeams[j].lng
      );
      if (distanceKm == null || d > distanceKm) distanceKm = d;
    }
  }
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
        <EventTimer />
        {distanceText != null && (
          <div className="rounded bg-background/90 px-2 py-1.5 text-xs font-medium backdrop-blur">
            <span className="text-muted-foreground">
              {validDistanceTeams.length > 2 ? "Suurim tiimide vahe: " : "Tiimide vahe: "}
            </span>
            <span className="text-primary font-semibold">{distanceText}</span>
          </div>
        )}
      </div>
      <p className="absolute bottom-2 left-2 right-2 rounded bg-background/80 px-2 py-1 text-center text-xs text-muted-foreground backdrop-blur">
        Täpid: viimane asukoht. Jooned: tee, kust meeskonnad on läbi käinud.
        {teamsWithPenalty.length > 0 && " Sinine täpp = karistus aktiivne."}
      </p>
    </div>
  );
}
