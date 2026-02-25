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
  const outcomesJson =
    typeof body.outcomesJson === "string"
      ? body.outcomesJson
      : JSON.stringify(body.outcomesJson);

  await prisma.wheelConfig.upsert({
    where: { id: "default" },
    update: { outcomesJson },
    create: { id: "default", outcomesJson },
  });
  return NextResponse.json({ success: true });
}
