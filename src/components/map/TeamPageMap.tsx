"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const SOURCE_ID = "team-point";
const LAYER_ID = "team-circle";

type TeamPageMapProps = {
  teamId: number;
  name: string;
  color: string;
  lastLat: number | null;
  lastLng: number | null;
  accessToken: string;
};

export function TeamPageMap({
  teamId,
  name: _name,
  color,
  lastLat: initialLat,
  lastLng: initialLng,
  accessToken,
}: TeamPageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);

  const center: [number, number] =
    lat != null && lng != null ? [lng, lat] : [15.5, 52]; // Europe default
  const zoom = lat != null && lng != null ? 8 : 4;

  const initMap = useCallback(() => {
    if (!mapRef.current || !accessToken) return;
    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: MAP_STYLE,
      center: (initialLat != null && initialLng != null) ? [initialLng, initialLat] : [15.5, 52],
      zoom: (initialLat != null && initialLng != null) ? 8 : 4,
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

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch("/api/teams");
        if (!res.ok) return;
        const data = await res.json();
        const t = data.find((d: { id: number }) => d.id === teamId);
        if (t?.lastLat != null && t?.lastLng != null) {
          setLat(t.lastLat);
          setLng(t.lastLng);
        }
      } catch (_) {}
    };
    const t0 = setTimeout(fetchTeam, 500);
    const interval = setInterval(fetchTeam, 15000);
    return () => {
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [teamId]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || lat == null || lng == null) return;

    const features: GeoJSON.Feature<GeoJSON.Point>[] = [
      {
        type: "Feature",
        properties: { color },
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
      map.flyTo({ center: [lng, lat], zoom: 8, duration: 1000 });
    };

    if (map.isStyleLoaded()) {
      applyData();
    } else {
      map.once("load", applyData);
    }
  }, [lat, lng, color]);

  if (!accessToken) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Kaarti ei saa kuvada (puudub kaardi võti).
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30">
      <div ref={mapRef} className="h-[280px] w-full" />
    </div>
  );
}
