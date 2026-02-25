import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

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

    const stripeSession = await stripe.checkout.sessions.create({
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
            unit_amount: option.priceCents,
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
