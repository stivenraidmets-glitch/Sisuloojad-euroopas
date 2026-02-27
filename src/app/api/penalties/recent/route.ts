import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  try {
    const penalties = await prisma.penalty.findMany({
      where: teamId ? { teamId: parseInt(teamId, 10) } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        penaltyOption: { select: { title: true } },
        team: { select: { name: true } },
        purchasedBy: { select: { name: true, email: true } },
      },
    });

    const list = penalties.map((p) => ({
      id: p.id,
      teamName: p.team.name,
      title: p.penaltyOption.title,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      buyerName: p.purchasedBy?.name?.trim() || p.purchasedBy?.email || "—",
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error("Recent penalties error:", e);
    return NextResponse.json(
      { error: "Failed to fetch penalties" },
      { status: 500 }
    );
  }
}
