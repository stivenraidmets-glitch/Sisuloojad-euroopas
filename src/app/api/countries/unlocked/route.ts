import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const unlocks = await prisma.countryUnlock.findMany({
      orderBy: { unlockedAt: "asc" },
      select: { countryCode: true, teamId: true },
    });
    const byCountry: Record<string, number> = {};
    unlocks.forEach((u) => {
      byCountry[u.countryCode] = u.teamId;
    });
    return NextResponse.json(byCountry);
  } catch (e) {
    console.error("Unlocked countries error:", e);
    return NextResponse.json(
      { error: "Failed to fetch unlocked countries" },
      { status: 500 }
    );
  }
}
