import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyPenaltyToChat } from "@/lib/chat-notify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const penaltyOptionId = typeof body.penaltyOptionId === "string" ? body.penaltyOptionId : "";
    const teamId = typeof body.teamId === "number" ? body.teamId : parseInt(body.teamId, 10);

    if (!penaltyOptionId || !teamId || (teamId !== 1 && teamId !== 2)) {
      return NextResponse.json(
        { error: "penaltyOptionId and teamId (1 or 2) required" },
        { status: 400 }
      );
    }

    const isTestAdmin = session.user.email?.toLowerCase() === "test@test.com";

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, freePenaltyBalance: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const wheelSpin = await prisma.wheelSpin.findUnique({
      where: { userId: user.id },
    });
    const canUseBalance = (user.freePenaltyBalance ?? 0) > 0;
    const canUseWheel =
      wheelSpin?.resultType === "FREE_PENALTY" && wheelSpin.redeemedAt == null;

    if (!isTestAdmin && !canUseBalance && !canUseWheel) {
      return NextResponse.json(
        { error: "Sul pole kasutamata tasuta karistust." },
        { status: 400 }
      );
    }

    const option = await prisma.penaltyOption.findUnique({
      where: { id: penaltyOptionId },
    });
    if (!option) {
      return NextResponse.json(
        { error: "Karistuse valik ei leitud." },
        { status: 404 }
      );
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        teamId,
        penaltyOptionId: option.id,
        amountCents: 0,
        status: "COMPLETED",
      },
    });

    const now = new Date();
    await prisma.penalty.create({
      data: {
        teamId,
        penaltyOptionId: option.id,
        purchasedByUserId: user.id,
        status: "ACTIVE",
        startsAt: now,
        purchaseId: purchase.id,
      },
    });

    if (!isTestAdmin) {
      if (canUseBalance) {
        await prisma.user.update({
          where: { id: user.id },
          data: { freePenaltyBalance: { decrement: 1 } },
        });
      } else {
        await prisma.wheelSpin.update({
          where: { userId: user.id },
          data: { redeemedAt: new Date() },
        });
      }
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });
    if (team) await notifyPenaltyToChat(team.name, option.title, true);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Redeem free error:", e);
    return NextResponse.json(
      { error: "Tasuta karistuse kasutamine ebaõnnestus." },
      { status: 500 }
    );
  }
}
