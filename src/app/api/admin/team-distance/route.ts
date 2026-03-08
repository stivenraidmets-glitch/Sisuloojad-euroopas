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

  const body = await req.json();
  const teamId = parseInt(body.teamId, 10);
  if (teamId !== 1 && teamId !== 2) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }

  const action = body.action === "set" ? "set" : "reset";
  const value = typeof body.value === "number" && body.value >= 0 ? body.value : 0;

  try {
    if (action === "reset") {
      await prisma.team.update({
        where: { id: teamId },
        data: { totalDistanceKm: 0 },
      });
      return NextResponse.json({ success: true, totalDistanceKm: 0 });
    }
    await prisma.team.update({
      where: { id: teamId },
      data: { totalDistanceKm: value },
    });
    return NextResponse.json({ success: true, totalDistanceKm: value });
  } catch (e) {
    console.error("Admin team-distance error:", e);
    return NextResponse.json({ error: "Failed to update distance" }, { status: 500 });
  }
}
