import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateSystemUser } from "@/lib/chat-notify";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_CHAT_MESSAGE } from "@/lib/pusher";

export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 800; // allow long GIF URLs (Giphy, Tenor, etc.)
const MAX_MESSAGES = 100;

// Per-user rate limit: max 30 messages per minute (per serverless instance)
const CHAT_RATE_LIMIT_PER_MIN = 30;
const chatRateLimitMap = new Map<string, number[]>();

function isChatRateLimited(email: string): boolean {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const windowMs = 60_000;
  let times = chatRateLimitMap.get(key) ?? [];
  times = times.filter((t) => now - t < windowMs);
  if (times.length >= CHAT_RATE_LIMIT_PER_MIN) return true;
  times.push(now);
  chatRateLimitMap.set(key, times);
  return false;
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const CMD_RESET_DISTANCE = "/reset-distance";

export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: "asc" },
      take: MAX_MESSAGES,
      include: {
        user: { select: { email: true, name: true } },
      },
    });
    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        body: m.body,
        userName: m.user.name?.trim() || m.user.email,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error("Chat GET error:", e);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const email = session.user.email.toLowerCase().trim();
    const isAdmin = ADMIN_EMAILS.includes(email);
    if (!isAdmin && isChatRateLimited(email)) {
      return NextResponse.json(
        { error: "Liiga palju sõnumeid. Oota hetk." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const text = typeof body.body === "string" ? body.body.trim().slice(0, MAX_BODY_LENGTH) : "";
    if (!text) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Admin command: reset both teams' traveled distance
    if (text.toLowerCase() === CMD_RESET_DISTANCE) {
      const email = session.user.email.toLowerCase();
      if (!ADMIN_EMAILS.includes(email)) {
        return NextResponse.json({ error: "Vain administraatorid saavad seda käsku kasutada." }, { status: 403 });
      }
      await prisma.team.updateMany({
        data: { totalDistanceKm: 0 },
      });
      const systemUserId = await getOrCreateSystemUser();
      const systemMsg = await prisma.chatMessage.create({
        data: {
          userId: systemUserId,
          body: "✅ Admin resetas meeskondade läbitud distantsi.",
        },
        include: { user: { select: { email: true, name: true } } },
      });
      const payload = {
        id: systemMsg.id,
        body: systemMsg.body,
        userName: systemMsg.user.name?.trim() || systemMsg.user.email,
        createdAt: systemMsg.createdAt.toISOString(),
      };
      try {
        await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_CHAT_MESSAGE, payload);
      } catch (_) {}
      return NextResponse.json(payload);
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const message = await prisma.chatMessage.create({
      data: { userId: user.id, body: text },
      include: { user: { select: { email: true, name: true } } },
    });
    const payload = {
      id: message.id,
      body: message.body,
      userName: message.user.name?.trim() || message.user.email,
      createdAt: message.createdAt.toISOString(),
    };
    try {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_CHAT_MESSAGE, payload);
    } catch (_) {}
    return NextResponse.json(payload);
  } catch (e) {
    console.error("Chat POST error:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
