import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_POINTS_PER_TEAM = 500;

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { id: "asc" },
      select: { id: true, color: true },
    });

    const trails: Record<number, { color: string; coordinates: [number, number][] }> = {};

    for (const team of teams) {
      const orderedPoints = await prisma.teamLocationPoint.findMany({
        where: { teamId: team.id },
        orderBy: { createdAt: "desc" },
        take: MAX_POINTS_PER_TEAM,
        select: { lat: true, lng: true },
      });

      const coordinates = orderedPoints
        .reverse()
        .map((p) => [p.lng, p.lat] as [number, number]);

      if (coordinates.length >= 2) {
        trails[team.id] = { color: team.color, coordinates };
      }
    }

    return NextResponse.json(trails);
  } catch (e) {
    console.error("Trails error:", e);
    return NextResponse.json(
      { error: "Failed to fetch trails" },
      { status: 500 }
    );
  }
}
