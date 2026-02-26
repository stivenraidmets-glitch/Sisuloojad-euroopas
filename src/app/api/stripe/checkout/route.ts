import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { notifyPenaltyToChat } from "@/lib/chat-notify";

export const dynamic = "force-dynamic";

const TEST_ADMIN_EMAIL = "test@test.com";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { penaltyOptionId, teamId } = body as {
      penaltyOptionId: string;
      teamId: number;
    };

    if (!penaltyOptionId || !teamId) {
      return NextResponse.json(
        { error: "penaltyOptionId and teamId required" },
        { status: 400 }
      );
    }

    const option = await prisma.penaltyOption.findUnique({
      where: { id: penaltyOptionId },
    });
    if (!option) {
      return NextResponse.json(
        { error: "Penalty option not found" },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // Dev/admin test account: create penalty for free, no Stripe
    if (session.user.email?.toLowerCase() === TEST_ADMIN_EMAIL) {
      const purchase = await prisma.purchase.create({
        data: {
          userId: user.id,
          teamId,
          penaltyOptionId: option.id,
          amountCents: 0,
          status: "COMPLETED",
        },
      });
      await prisma.penalty.create({
        data: {
          teamId,
          penaltyOptionId: option.id,
          purchasedByUserId: user.id,
          status: "ACTIVE",
          startsAt: new Date(),
          purchaseId: purchase.id,
        },
      });
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { name: true },
      });
      if (team) await notifyPenaltyToChat(team.name, option.title, true);
      return NextResponse.json({ redirectUrl: `${origin}/?checkout=success` });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      );
    }

    const wheelSpin = await prisma.wheelSpin.findUnique({
      where: { userId: user.id },
    });
    const useHalfOff =
      wheelSpin?.resultType === "HALF_OFF_PENALTY" && wheelSpin.redeemedAt == null;
    const amountCents = useHalfOff
      ? Math.max(50, Math.round(option.priceCents / 2))
      : option.priceCents;

    const stripeSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: option.title,
              description: option.description ?? undefined,
              metadata: {
                penaltyOptionId: option.id,
                teamId: String(teamId),
                userId: user.id,
              },
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: {
        userId: user.id,
        penaltyOptionId: option.id,
        teamId: String(teamId),
        ...(useHalfOff ? { wheelHalfOff: "true" } : {}),
      },
      customer_email: session.user.email,
    });

    await prisma.purchase.create({
      data: {
        userId: user.id,
        teamId,
        penaltyOptionId: option.id,
        amountCents: option.priceCents,
        stripeSessionId: stripeSession.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
