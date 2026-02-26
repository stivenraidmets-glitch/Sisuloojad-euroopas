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
    const userId = (session.user as { id: string }).id;
    const [user, spin] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { freePenaltyBalance: true },
      }),
      prisma.wheelSpin.findUnique({
        where: { userId },
        select: { resultType: true, value: true, redeemedAt: true, createdAt: true },
      }),
    ]);

    const freeBalance = user?.freePenaltyBalance ?? 0;
    const hasWheelFree = spin?.resultType === "FREE_PENALTY" && spin.redeemedAt == null;
    const hasFreePrize = freeBalance > 0 || hasWheelFree;

    if (!spin) {
      return NextResponse.json({
        hasSpun: false,
        result: null,
        freePenaltyBalance: freeBalance,
        hasPrize: freeBalance > 0,
        isRedeemed: false,
      });
    }

    const hasPrize =
      hasFreePrize ||
      spin.resultType === "HALF_OFF_PENALTY" ||
      spin.resultType === "CREDITS";

    const freeRedeemed = freeBalance === 0 && (spin.resultType !== "FREE_PENALTY" || spin.redeemedAt != null);

    return NextResponse.json({
      hasSpun: true,
      result: {
        type: spin.resultType,
        value: spin.value,
        redeemedAt: spin.redeemedAt?.toISOString() ?? null,
      },
      freePenaltyBalance: freeBalance,
      hasPrize,
      isRedeemed: freeRedeemed,
    });
  } catch (e) {
    console.error("Winnings GET error:", e);
    return NextResponse.json({ error: "Failed to load winnings" }, { status: 500 });
  }
}
