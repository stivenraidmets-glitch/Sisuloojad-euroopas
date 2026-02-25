import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Apply privacy jitter: add random offset up to maxKm in km */
export function applyJitter(lat: number, lng: number, maxKm: number = 2): { lat: number; lng: number } {
  const degPerKm = 1 / 111; // rough
  const offset = (Math.random() - 0.5) * 2 * maxKm * degPerKm;
  const latOffset = (Math.random() - 0.5) * 2 * maxKm * degPerKm;
  return {
    lat: lat + latOffset,
    lng: lng + offset,
  };
}

/** Round to ~hundreds of meters for display (optional) */
export function roundCoordinate(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Distance between two points in km (Haversine) */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
