import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultTeams } from "@/lib/default-teams";
import { voteBodySchema } from "@/lib/validation";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_VOTES } from "@/lib/pusher";

export async function POST(req: Request) {
  try {
    await ensureDefaultTeams();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = voteBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const team = await prisma.team.findUnique({
      where: { id: parsed.data.teamId },
      select: { id: true },
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    await prisma.vote.upsert({
      where: { userId: user.id },
      update: { teamId: parsed.data.teamId },
      create: {
        userId: user.id,
        teamId: parsed.data.teamId,
      },
    });

    const counts = await prisma.vote.groupBy({
      by: ["teamId"],
      _count: { teamId: true },
    });
    const total = counts.reduce((s, c) => s + c._count.teamId, 0);
    const countsByTeam = Object.fromEntries(
      counts.map((c) => [c.teamId, c._count.teamId])
    );

    if (process.env.PUSHER_APP_ID) {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_VOTES, {
        countsByTeam,
        total,
      });
    }

    return NextResponse.json({ success: true, countsByTeam, total });
  } catch (e) {
    console.error("Vote error:", e);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await ensureDefaultTeams();
    const counts = await prisma.vote.groupBy({
      by: ["teamId"],
      _count: { teamId: true },
    });
    const total = counts.reduce((s, c) => s + c._count.teamId, 0);
    const countsByTeam = Object.fromEntries(
      counts.map((c) => [c.teamId, c._count.teamId])
    );
    return NextResponse.json({ countsByTeam, total });
  } catch (e) {
    console.error("Vote count error:", e);
    return NextResponse.json(
      { error: "Failed to get counts" },
      { status: 500 }
    );
  }
}
