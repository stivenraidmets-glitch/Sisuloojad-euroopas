import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcastBodySchema } from "@/lib/validation";
import { roundCoordinate, haversineDistanceKm } from "@/lib/utils";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_LOCATION, PUSHER_EVENT_COUNTRY_UNLOCK } from "@/lib/pusher";
import { getCountryCodeFromCoords } from "@/lib/geocode";
import { notifyCountryUnlockToChat } from "@/lib/chat-notify";

const RATE_LIMIT_MS = 5000; // 1 update per 5 seconds per team
const lastUpdate: Record<number, number> = {};

function parseBroadcastInput(
  lat: number,
  lng: number,
  teamId: number,
  secret: string
): { error: Response } | { lat: number; lng: number; teamId: number; secret: string } {
  const parsed = broadcastBodySchema.safeParse({ lat, lng, teamId, secret });
  if (!parsed.success) {
    return { error: NextResponse.json({ error: "Invalid parameters" }, { status: 400 }) };
  }
  return parsed.data;
}

async function processBroadcast(
  lat: number,
  lng: number,
  teamId: number,
  secretTrimmed: string
): Promise<Response> {
  const expectedSecret = (process.env.BROADCAST_SECRET || "").trim();
  const allowedSecrets = ["broadcast"];
  if (expectedSecret.length > 0) allowedSecrets.push(expectedSecret);
  const allowed = allowedSecrets.some((s) => s === secretTrimmed);
  if (!allowed || secretTrimmed.length === 0) {
    return NextResponse.json(
      {
        error: "Invalid secret. Use ?secret=broadcast or BROADCAST_SECRET in Vercel.",
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

  try {
    const countryCode = await getCountryCodeFromCoords(displayLat, displayLng);
    if (countryCode) {
      const existing = await prisma.countryUnlock.findUnique({
        where: { countryCode },
      });
      if (!existing) {
        await prisma.countryUnlock.create({
          data: { countryCode, teamId },
        });
        const teamName = team?.name ?? `Meeskond ${teamId}`;
        await notifyCountryUnlockToChat(teamName, countryCode);
        if (process.env.PUSHER_APP_ID) {
          try {
            await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_COUNTRY_UNLOCK, {
              countryCode,
              teamId,
            });
          } catch (e) {
            console.error("Pusher country-unlock:", e);
          }
        }
      }
    }
  } catch (e) {
    console.error("Country unlock check:", e);
  }

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
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const teamId = Number(searchParams.get("teamId"));
  const secret = (searchParams.get("secret") ?? "").trim();
  const parsed = parseBroadcastInput(lat, lng, teamId, secret);
  if ("error" in parsed) return parsed.error;
  return processBroadcast(parsed.lat, parsed.lng, parsed.teamId, parsed.secret);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = broadcastBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { lat, lng, teamId, secret } = parsed.data;
    return processBroadcast(lat, lng, teamId, typeof secret === "string" ? secret.trim() : "");
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
