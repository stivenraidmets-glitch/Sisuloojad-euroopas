import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcastBodySchema } from "@/lib/validation";
import { roundCoordinate, haversineDistanceKm } from "@/lib/utils";
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
    const secretTrimmed = typeof secret === "string" ? secret.trim() : "";

    const expectedSecret = (process.env.BROADCAST_SECRET || "").trim();
    const allowedSecrets = ["broadcast"];
    if (expectedSecret.length > 0) allowedSecrets.push(expectedSecret);
    const allowed = allowedSecrets.some((s) => s === secretTrimmed);
    if (!allowed || secretTrimmed.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid secret. Use ?secret=broadcast in the URL, or the same value as BROADCAST_SECRET in Vercel.",
        },
        { status: 403 }
      );
    }

    const now = Date.now();
    if (lastUpdate[teamId] && now - lastUpdate[teamId] < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: "Rate limited. Wait 5 seconds." },
        { status: 429 }
      );
    }
    lastUpdate[teamId] = now;

    // No jitter: use accurate GPS. Round to ~1 m (5 decimals) for storage
    const displayLat = roundCoordinate(lat, 5);
    const displayLng = roundCoordinate(lng, 5);

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    let addKm = 0;
    if (team?.lastLat != null && team?.lastLng != null) {
      addKm = haversineDistanceKm(
        team.lastLat,
        team.lastLng,
        displayLat,
        displayLng
      );
      // Ignore GPS glitches: cap at ~0.5 km per update (e.g. 30s interval = walking/running pace)
      const MAX_KM_PER_UPDATE = 0.5;
      if (addKm > MAX_KM_PER_UPDATE) addKm = 0;
    }

    await prisma.$transaction([
      prisma.team.update({
        where: { id: teamId },
        data: {
          lastLat: displayLat,
          lastLng: displayLng,
          lastUpdatedAt: new Date(),
          totalDistanceKm: { increment: addKm },
        },
      }),
      prisma.teamLocationPoint.create({
        data: { teamId, lat: displayLat, lng: displayLng },
      }),
    ]);

    if (process.env.PUSHER_APP_ID) {
      try {
        await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_LOCATION, {
          teamId,
          lat: displayLat,
          lng: displayLng,
          lastUpdatedAt: new Date().toISOString(),
        });
      } catch (pusherErr) {
        console.error("Broadcast: Pusher failed (location was saved):", pusherErr);
      }
    }

    return NextResponse.json({
      success: true,
      lat: displayLat,
      lng: displayLng,
    });
  } catch (e) {
    console.error("Broadcast error:", e);
    const isPrisma = e && typeof e === "object" && "code" in e;
    const message = isPrisma
      ? "Andmebaasiga ühendus ebaõnnestus. Kontrolli DATABASE_URL Vercelis."
      : e instanceof Error
        ? e.message
        : "Failed to update location";
    return NextResponse.json(
      { error: message },
      { status: isPrisma ? 503 : 500 }
    );
  }
}
