import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { voteBodySchema } from "@/lib/validation";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_VOTES } from "@/lib/pusher";

export async function POST(req: Request) {
  try {
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
    const team1 = counts.find((c) => c.teamId === 1)?._count.teamId ?? 0;
    const team2 = counts.find((c) => c.teamId === 2)?._count.teamId ?? 0;

    if (process.env.PUSHER_APP_ID) {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_VOTES, {
        team1,
        team2,
        total,
      });
    }

    return NextResponse.json({ success: true, team1, team2, total });
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
    const counts = await prisma.vote.groupBy({
      by: ["teamId"],
      _count: { teamId: true },
    });
    const total = counts.reduce((s, c) => s + c._count.teamId, 0);
    const team1 = counts.find((c) => c.teamId === 1)?._count.teamId ?? 0;
    const team2 = counts.find((c) => c.teamId === 2)?._count.teamId ?? 0;
    return NextResponse.json({ team1, team2, total });
  } catch (e) {
    console.error("Vote count error:", e);
    return NextResponse.json(
      { error: "Failed to get counts" },
      { status: 500 }
    );
  }
}
