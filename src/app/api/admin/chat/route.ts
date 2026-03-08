import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  try {
    const body = await req.json();
    const action = body.action === "clear-from" ? "clear-from" : "clear-all";
    const minutesBack = typeof body.minutesBack === "number" ? body.minutesBack : 5;

    if (action === "clear-all") {
      await prisma.chatMessage.deleteMany({});
      return NextResponse.json({ success: true, cleared: "all" });
    }

    const since = new Date(Date.now() - minutesBack * 60 * 1000);
    const result = await prisma.chatMessage.deleteMany({
      where: { createdAt: { gte: since } },
    });
    return NextResponse.json({ success: true, cleared: result.count });
  } catch (e) {
    console.error("Admin chat clear error:", e);
    return NextResponse.json({ error: "Failed to clear chat" }, { status: 500 });
  }
}
