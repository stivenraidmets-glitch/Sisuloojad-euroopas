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
        penalties: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { startsAt: "desc" },
          select: {
            startsAt: true,
            penaltyOption: {
              select: { title: true, type: true, durationMinutes: true },
            },
          },
        },
      },
    });

    const withActive = teams.map((t) => {
      const p = t.penalties[0];
      const option = p?.penaltyOption;
      const startsAt = p?.startsAt ? new Date(p.startsAt) : null;
      const durationMin = option?.durationMinutes ?? 0;
      const endsAt =
        startsAt && durationMin > 0
          ? new Date(startsAt.getTime() + durationMin * 60 * 1000)
          : null;
      const { penalties: _, ...rest } = t;
      return {
        ...rest,
        activePenalty:
          p && option && endsAt
            ? {
                title: option.title,
                type: option.type,
                endsAt: endsAt.toISOString(),
                durationMinutes: durationMin,
              }
            : null,
      };
    });

    return NextResponse.json(withActive);
  } catch (e) {
    console.error("Teams error:", e);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
