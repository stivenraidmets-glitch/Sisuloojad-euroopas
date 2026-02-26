import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        lastLat: true,
        lastLng: true,
        lastUpdatedAt: true,
        totalDistanceKm: true,
      },
    });
    return NextResponse.json(teams);
  } catch (e) {
    console.error("Teams error:", e);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
