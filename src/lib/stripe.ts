import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazy-init so build works without STRIPE_SECRET_KEY set */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

export function getStripePrice(amountCents: number): number {
  return Math.round(amountCents); // Stripe uses cents for EUR
}
