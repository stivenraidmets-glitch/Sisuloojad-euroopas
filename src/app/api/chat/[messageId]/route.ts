import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pusherServer, PUSHER_CHANNEL, PUSHER_EVENT_CHAT_MESSAGE_DELETED } from "@/lib/pusher";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { messageId } = await params;
  if (!messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  try {
    await prisma.chatMessage.delete({
      where: { id: messageId },
    });
    try {
      await pusherServer.trigger(PUSHER_CHANNEL, PUSHER_EVENT_CHAT_MESSAGE_DELETED, {
        messageId,
      });
    } catch (_) {}
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Chat delete error:", e);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
