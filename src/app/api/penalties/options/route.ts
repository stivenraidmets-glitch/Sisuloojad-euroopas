import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const options = await prisma.penaltyOption.findMany({
      orderBy: { priceCents: "asc" },
    });
    return NextResponse.json(options);
  } catch (e) {
    console.error("Penalty options error:", e);
    return NextResponse.json(
      { error: "Failed to fetch options" },
      { status: 500 }
    );
  }
}
