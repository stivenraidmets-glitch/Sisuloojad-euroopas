/**
 * Reverse geocode (lat, lng) to country code using Mapbox Geocoding API.
 * Returns ISO 3166-1 alpha-2 uppercase (e.g. "DE", "PL") or null.
 */
export async function getCountryCodeFromCoords(
  lat: number,
  lng: number
): Promise<string | null> {
  const token =
    process.env.MAPBOX_SECRET_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("types", "country");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ properties?: { short_code?: string } }>;
    };
    const code = data.features?.[0]?.properties?.short_code;
    if (typeof code !== "string" || code.length !== 2) return null;
    return code.toUpperCase();
  } catch {
    return null;
  }
}
