import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await prisma.raceStatus.findUnique({
      where: { id: "default" },
      select: { eventStartedAt: true },
    });
    return NextResponse.json({
      startedAt: row?.eventStartedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("Event timer GET error:", e);
    return NextResponse.json(
      { error: "Failed to get event timer" },
      { status: 500 }
    );
  }
}
