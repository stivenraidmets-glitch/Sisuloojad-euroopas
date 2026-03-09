import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_EVENT_TIMER } from "@/lib/pusher";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const row = await prisma.raceStatus.findUnique({
      where: { id: "default" },
      select: { eventStartedAt: true },
    });
    return NextResponse.json({
      startedAt: row?.eventStartedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("Admin event-timer GET error:", e);
    return NextResponse.json({ error: "Failed to get timer" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action === "reset" ? "reset" : null;
  if (action !== "reset") {
    return NextResponse.json({ error: "action: 'reset' required" }, { status: 400 });
  }

  try {
    const now = new Date();
    await prisma.raceStatus.upsert({
      where: { id: "default" },
      update: { eventStartedAt: now },
      create: { id: "default", status: "pre-race", eventStartedAt: now },
    });
    try {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_EVENT_TIMER, {
        startedAt: now.toISOString(),
      });
    } catch (pusherErr) {
      console.error("Admin event-timer: Pusher failed", pusherErr);
    }
    return NextResponse.json({ success: true, startedAt: now.toISOString() });
  } catch (e) {
    console.error("Admin event-timer reset error:", e);
    return NextResponse.json({ error: "Failed to reset timer" }, { status: 500 });
  }
}
