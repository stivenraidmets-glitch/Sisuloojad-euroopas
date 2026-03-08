import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_COUNTRY_UNLOCK } from "@/lib/pusher";

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
    const unlocks = await prisma.countryUnlock.findMany({
      orderBy: { unlockedAt: "asc" },
      include: { team: { select: { id: true, name: true, color: true } } },
    });
    return NextResponse.json(unlocks);
  } catch (e) {
    console.error("Admin countries GET error:", e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const countryCode = typeof body.countryCode === "string" ? body.countryCode.trim().toUpperCase().slice(0, 2) : "";
  const teamId = parseInt(body.teamId, 10);
  if (!countryCode || (teamId !== 1 && teamId !== 2)) {
    return NextResponse.json({ error: "countryCode (2 letters) and teamId (1 or 2) required" }, { status: 400 });
  }
  try {
    await prisma.countryUnlock.upsert({
      where: { countryCode },
      create: { countryCode, teamId },
      update: { teamId },
    });
    try {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_COUNTRY_UNLOCK, { countryCode, teamId });
    } catch (e) {
      console.error("Pusher country-unlock:", e);
    }
    return NextResponse.json({ success: true, countryCode, teamId });
  } catch (e) {
    console.error("Admin countries POST error:", e);
    return NextResponse.json({ error: "Failed to assign country" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const countryCode = (searchParams.get("countryCode") ?? "").trim().toUpperCase().slice(0, 2);
  if (!countryCode) {
    return NextResponse.json({ error: "countryCode required" }, { status: 400 });
  }
  try {
    await prisma.countryUnlock.delete({ where: { countryCode } });
    try {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_COUNTRY_UNLOCK, { countryCode, removed: true });
    } catch (e) {
      console.error("Pusher country-unlock:", e);
    }
    return NextResponse.json({ success: true, countryCode });
  } catch (e) {
    console.error("Admin countries DELETE error:", e);
    return NextResponse.json({ error: "Failed to remove country" }, { status: 500 });
  }
}
