import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export function getStripePrice(amountCents: number): number {
  return Math.round(amountCents); // Stripe uses cents for EUR
}
