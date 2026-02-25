import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { WheelOutcome } from "@/types";

function pickOutcome(outcomes: WheelOutcome[]): WheelOutcome {
  const total = outcomes.reduce((s, o) => s + o.probability, 0);
  let r = Math.random() * total;
  for (const o of outcomes) {
    r -= o.probability;
    if (r <= 0) return o;
  }
  return outcomes[outcomes.length - 1];
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.hasSpunWheel) {
      return NextResponse.json(
        { error: "You have already spun the wheel" },
        { status: 400 }
      );
    }

    const config = await prisma.wheelConfig.findUnique({
      where: { id: "default" },
    });
    const outcomes: WheelOutcome[] = config
      ? JSON.parse(config.outcomesJson)
      : [
          { type: "CREDITS", value: 10, probability: 40 },
          { type: "CREDITS", value: 25, probability: 20 },
          { type: "FREE_PENALTY", value: 0, probability: 10 },
          { type: "NOTHING", value: 0, probability: 30 },
        ];

    const result = pickOutcome(outcomes);

    await prisma.$transaction([
      prisma.wheelSpin.create({
        data: {
          userId: user.id,
          resultType: result.type,
          value: result.value,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          hasSpunWheel: true,
          ...(result.type === "CREDITS"
            ? { creditsBalance: { increment: result.value } }
            : {}),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      result: {
        type: result.type,
        value: result.value,
      },
    });
  } catch (e) {
    console.error("Wheel spin error:", e);
    return NextResponse.json(
      { error: "Failed to spin wheel" },
      { status: 500 }
    );
  }
}
