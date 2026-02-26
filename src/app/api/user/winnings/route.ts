import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const spin = await prisma.wheelSpin.findUnique({
      where: { userId: (session.user as { id: string }).id },
      select: { resultType: true, value: true, redeemedAt: true, createdAt: true },
    });

    if (!spin) {
      return NextResponse.json({
        hasSpun: false,
        result: null,
      });
    }

    const hasPrize =
      spin.resultType === "FREE_PENALTY" ||
      spin.resultType === "HALF_OFF_PENALTY" ||
      spin.resultType === "CREDITS";

    return NextResponse.json({
      hasSpun: true,
      result: {
        type: spin.resultType,
        value: spin.value,
        redeemedAt: spin.redeemedAt?.toISOString() ?? null,
      },
      hasPrize,
      isRedeemed: spin.redeemedAt != null,
    });
  } catch (e) {
    console.error("Winnings GET error:", e);
    return NextResponse.json({ error: "Failed to load winnings" }, { status: 500 });
  }
}
