import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const DURATION_MINUTES: Record<string, number> = {
  "1": 1,
  "5": 5,
  "15": 15,
  "45": 45,
  "60": 60,
  "180": 180,
  "1440": 1440,
  lifetime: 100 * 365 * 24 * 60,
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string; duration?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const durationKey = typeof body.duration === "string" ? body.duration.trim().toLowerCase() : "";

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const minutes = DURATION_MINUTES[durationKey];
  if (minutes === undefined) {
    return NextResponse.json(
      { error: "duration must be one of: 1, 5, 15, 45, 60, 180, 1440, lifetime" },
      { status: 400 }
    );
  }

  const mutedUntil = new Date(Date.now() + minutes * 60 * 1000);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { mutedUntil },
    });
    return NextResponse.json({ ok: true, mutedUntil: mutedUntil.toISOString() });
  } catch (e) {
    console.error("Chat timeout error:", e);
    return NextResponse.json({ error: "Failed to timeout user" }, { status: 500 });
  }
}
