import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const purchase = await prisma.purchase.findFirst({
      where: { stripeSessionId: session.id },
    });
    if (purchase && purchase.status === "PENDING") {
      const userId = session.metadata?.userId ?? purchase.userId;
      const teamId = session.metadata?.teamId
        ? parseInt(session.metadata.teamId, 10)
        : purchase.teamId;
      const penaltyOptionId =
        session.metadata?.penaltyOptionId ?? purchase.penaltyOptionId;

      if (teamId && penaltyOptionId) {
        await prisma.$transaction([
          prisma.purchase.update({
            where: { id: purchase.id },
            data: { status: "COMPLETED" },
          }),
          prisma.penalty.create({
            data: {
              teamId,
              penaltyOptionId,
              purchasedByUserId: userId,
              status: "PENDING",
              purchaseId: purchase.id,
            },
          }),
        ]);
      } else {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { status: "COMPLETED" },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
