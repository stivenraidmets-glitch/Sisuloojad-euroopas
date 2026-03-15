import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (q && q.length > 50) {
    return NextResponse.json([]);
  }
  if (!GIPHY_API_KEY) {
    return NextResponse.json([]);
  }
  try {
    // No query = trending/popular GIFs; otherwise search
    const isTrending = !q || q.length === 0;
    const url = new URL(
      isTrending
        ? "https://api.giphy.com/v1/gifs/trending"
        : "https://api.giphy.com/v1/gifs/search"
    );
    url.searchParams.set("api_key", GIPHY_API_KEY);
    url.searchParams.set("limit", "12");
    url.searchParams.set("rating", "g");
    if (!isTrending) url.searchParams.set("q", q);
    const res = await fetch(url.toString());
    if (!res.ok) return NextResponse.json([]);
    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        images?: { fixed_height?: { url?: string }; downsized_medium?: { url?: string }; original?: { url?: string } };
        title?: string;
      }>;
    };
    const list = (data.data ?? []).map((g) => {
      const url =
        g.images?.fixed_height?.url ??
        g.images?.downsized_medium?.url ??
        g.images?.original?.url ??
        "";
      return { id: g.id, url, title: g.title ?? "" };
    }).filter((g) => g.url);
    return NextResponse.json(list);
  } catch {
    return NextResponse.json([]);
  }
}
