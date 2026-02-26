import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamPenaltyQueue } from "@/lib/penalty-queue";

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

    const withPenalties = await Promise.all(
      teams.map(async (t) => {
        const { current, queued } = await getTeamPenaltyQueue(t.id);
        return {
          ...t,
          activePenalty: current,
          queuedPenalties: queued,
        };
      })
    );

    return NextResponse.json(withPenalties);
  } catch (e) {
    console.error("Teams error:", e);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
