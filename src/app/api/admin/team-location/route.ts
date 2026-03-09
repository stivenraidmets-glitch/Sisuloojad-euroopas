import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_LOCATION } from "@/lib/pusher";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const teamId = parseInt(body.teamId, 10);
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }
  const teamExists = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  if (!teamExists) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }
  if (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lng) || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { lastLat: lat, lastLng: lng, lastUpdatedAt: new Date() },
  });

  if (process.env.PUSHER_APP_ID) {
    try {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_LOCATION, {
        teamId,
        lat,
        lng,
        lastUpdatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Admin team-location: Pusher failed", e);
    }
  }

  return NextResponse.json({ success: true });
}
