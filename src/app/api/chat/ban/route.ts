import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_CHAT_MESSAGES_DELETED } from "@/lib/pusher";

export const dynamic = "force-dynamic";

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

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      select: { id: true },
    });
    const messageIds = messages.map((m) => m.id);

    await prisma.chatMessage.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { bannedFromChatAt: new Date(), mutedUntil: null },
    });

    if (messageIds.length > 0) {
      try {
        await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_CHAT_MESSAGES_DELETED, {
          messageIds,
        });
      } catch (_) {}
    }

    return NextResponse.json({ ok: true, deletedCount: messageIds.length });
  } catch (e) {
    console.error("Chat ban error:", e);
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 });
  }
}
