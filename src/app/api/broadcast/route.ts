import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcastBodySchema } from "@/lib/validation";
import { applyJitter, roundCoordinate, haversineDistanceKm } from "@/lib/utils";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_LOCATION } from "@/lib/pusher";

const RATE_LIMIT_MS = 5000; // 1 update per 5 seconds per team
const lastUpdate: Record<number, number> = {};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = broadcastBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { lat, lng, teamId, secret } = parsed.data;

    if (secret !== process.env.BROADCAST_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    const now = Date.now();
    if (lastUpdate[teamId] && now - lastUpdate[teamId] < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: "Rate limited. Wait 5 seconds." },
        { status: 429 }
      );
    }
    lastUpdate[teamId] = now;

    const { lat: jitteredLat, lng: jitteredLng } = applyJitter(lat, lng, 2);
    const displayLat = roundCoordinate(jitteredLat);
    const displayLng = roundCoordinate(jitteredLng);

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    let addKm = 0;
    if (team?.lastLat != null && team?.lastLng != null) {
      addKm = haversineDistanceKm(
        team.lastLat,
        team.lastLng,
        displayLat,
        displayLng
      );
    }

    await prisma.team.update({
      where: { id: teamId },
      data: {
        lastLat: displayLat,
        lastLng: displayLng,
        lastUpdatedAt: new Date(),
        totalDistanceKm: { increment: addKm },
      },
    });

    if (process.env.PUSHER_APP_ID) {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_LOCATION, {
        teamId,
        lat: displayLat,
        lng: displayLng,
        lastUpdatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      lat: displayLat,
      lng: displayLng,
    });
  } catch (e) {
    console.error("Broadcast error:", e);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}
