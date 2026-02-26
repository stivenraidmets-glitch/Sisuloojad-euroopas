import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateSystemUser } from "@/lib/chat-notify";

export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 500;
const MAX_MESSAGES = 100;

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
      return NextResponse.json({
        id: systemMsg.id,
        body: systemMsg.body,
        userName: systemMsg.user.name?.trim() || systemMsg.user.email,
        createdAt: systemMsg.createdAt.toISOString(),
      });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const message = await prisma.chatMessage.create({
      data: { userId: user.id, body: text },
      include: { user: { select: { email: true, name: true } } },
    });
    return NextResponse.json({
      id: message.id,
      body: message.body,
      userName: message.user.name?.trim() || message.user.email,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("Chat POST error:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
