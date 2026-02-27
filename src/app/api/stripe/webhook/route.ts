import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { notifyPenaltyToChat } from "@/lib/chat-notify";
import { addOrCreatePenalty } from "@/lib/penalty-queue";

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
        const option = await prisma.penaltyOption.findUnique({
          where: { id: penaltyOptionId },
          select: { title: true },
        });
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { name: true },
        });
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { status: "COMPLETED" },
        });
        await addOrCreatePenalty({
          teamId,
          penaltyOptionId,
          userId,
          purchaseId: purchase.id,
        });
        if (team && option) {
          await notifyPenaltyToChat(team.name, option.title, true);
        }
      } else {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { status: "COMPLETED" },
        });
      }

      if (session.metadata?.wheelHalfOff === "true" && userId) {
        await prisma.wheelSpin.updateMany({
          where: { userId },
          data: { redeemedAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
