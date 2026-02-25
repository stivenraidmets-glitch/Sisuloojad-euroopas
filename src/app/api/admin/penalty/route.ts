import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED = ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"];

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { penaltyId, status } = body as { penaltyId: string; status: string };
  if (!penaltyId || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await prisma.penalty.update({
    where: { id: penaltyId },
    data: {
      status,
      ...(status === "ACTIVE" ? { startsAt: new Date() } : {}),
      ...(status === "COMPLETED" ? { enforcedAt: new Date() } : {}),
    },
  });
  return NextResponse.json({ success: true });
}
